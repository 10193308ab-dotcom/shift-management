'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function createStoreAccount(formData: FormData) {
  const storeName = formData.get('storeName') as string;
  const businessHours = formData.get('businessHours') as string;
  const loginId = formData.get('loginId') as string;
  const password = formData.get('password') as string;

  if (!storeName || !loginId || !password) {
    return { error: '必要な情報が不足しています' };
  }

  const email = loginId.includes('@') ? loginId : `${loginId}@shift.local`;

  // 1. Supabase Authで店舗アカウント作成
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: 'アカウント作成エラー: ' + authError?.message };
  }

  // 2. 店舗情報の作成 (StoreSettings)
  const { data: storeData, error: storeError } = await supabaseAdmin
    .from('StoreSettings')
    .insert([{
      StoreName: storeName,
      BusinessHours: businessHours,
      InviteCode: Math.random().toString(36).slice(-8)
    }])
    .select('StoreID')
    .single();

  if (storeError || !storeData) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: '店舗情報作成エラー: ' + storeError?.message };
  }

  // 3. 店舗責任者としてプロフィール作成
  const { error: userError } = await supabaseAdmin
    .from('Users')
    .insert([{
      UserID: authData.user.id,
      StoreID: storeData.StoreID,
      Name: storeName + ' 責任者',
      Role: '店長' // ロール自体は権限管理のため「店長」のまま
    }]);

  if (userError) {
    // 失敗した場合は作ってしまったAuthを削除してロールバック
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: '責任者プロフィール作成エラー: ' + userError.message };
  }

  return { success: true };
}
