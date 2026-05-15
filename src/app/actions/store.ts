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
      LoginId: loginId,
      LoginPassword: password,
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
      Role: '店舗' // 店舗アカウントとして登録
    }]);

  if (userError) {
    // 失敗した場合は作ってしまったAuthを削除してロールバック
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: '責任者プロフィール作成エラー: ' + userError.message };
  }

  return { success: true };
}

export async function updateStoreDetailsAndAccount(formData: FormData) {
  const storeId = formData.get('storeId') as string;
  const storeName = formData.get('storeName') as string;
  const businessHours = formData.get('businessHours') as string;
  const loginId = formData.get('loginId') as string;
  const password = formData.get('password') as string;

  if (!storeId || !storeName) {
    return { error: '必須項目が不足しています' };
  }

  // 1. 店舗情報の更新 (平文のID/Passも一緒に保存する)
  const updatePayload: any = { StoreName: storeName, BusinessHours: businessHours };
  if (loginId) updatePayload.LoginId = loginId;
  if (password) updatePayload.LoginPassword = password;

  const { error: storeError } = await supabaseAdmin
    .from('StoreSettings')
    .update(updatePayload)
    .eq('StoreID', storeId);

  if (storeError) {
    return { error: '店舗情報の更新エラー: ' + storeError.message };
  }

  // 2. アカウント情報（ID・パスワード）の更新がある場合
  if (loginId || password) {
    const { data: userData } = await supabaseAdmin
      .from('Users')
      .select('UserID')
      .eq('StoreID', storeId)
      .eq('Role', '店舗')
      .single();

    if (userData) {
      const updates: any = {};
      if (loginId) {
        updates.email = loginId.includes('@') ? loginId : `${loginId}@shift.local`;
      }
      if (password) {
        updates.password = password;
      }
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userData.UserID, updates);
      if (authError) {
        return { error: 'アカウント更新エラー: ' + authError.message };
      }
    }
  }

  return { success: true };
}
