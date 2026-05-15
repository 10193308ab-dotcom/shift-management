'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function createStaffAccount(formData: FormData) {
  const loginId = formData.get('loginId') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const storeId = formData.get('storeId') as string;

  if (!loginId || !password || !name || !storeId) {
    return { error: '必要な情報が不足しています' };
  }

  const email = loginId.includes('@') ? loginId : `${loginId}@shift.local`;

  // 1. Supabase Authでユーザー作成（Admin権限で作成するためログイン状態を維持）
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // メールの確認をスキップして即有効化
  });

  if (authError || !authData.user) {
    return { error: '認証アカウント作成エラー: ' + authError?.message };
  }

  // 2. Usersテーブルにスタッフとして登録
  const { error: userError } = await supabaseAdmin
    .from('Users')
    .insert([{
      UserID: authData.user.id,
      StoreID: storeId,
      Name: name,
      Role: 'スタッフ',
      LoginId: loginId,
      LoginPassword: password
    }]);

  if (userError) {
    // 失敗した場合は作ってしまったAuthを削除してロールバック
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: 'プロフィール作成エラー: ' + userError.message };
  }

  return { success: true };
}
