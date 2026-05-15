'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function createHeadquartersAccount(formData: FormData) {
  const storeName = formData.get('storeName') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password || !name || !storeName) {
    return { error: '必要な情報が不足しています' };
  }

  // 1. Admin APIを使ってユーザーを作成 (Rate Limitをバイパスする)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: 'アカウント作成エラー: ' + (authError?.message || '不明なエラー') };
  }

  const userId = authData.user.id;

  // 2. 店舗(Store)の作成
  const { data: storeData, error: storeError } = await supabaseAdmin
    .from('StoreSettings')
    .insert([{ StoreName: storeName, InviteCode: Math.random().toString(36).slice(-8) }])
    .select('StoreID')
    .single();

  if (storeError) {
    return { error: '店舗作成エラー: ' + storeError.message };
  }

  // 3. ユーザープロフィールの作成（本部として登録）
  const { error: userError } = await supabaseAdmin
    .from('Users')
    .insert([{ 
      UserID: userId, 
      StoreID: storeData.StoreID, 
      Name: name, 
      Role: '本部' 
    }]);

  if (userError) {
    return { error: 'プロフィール作成エラー: ' + userError.message };
  }

  return { success: true };
}
