import { createClient } from '@supabase/supabase-js';

// サーバー側でのみ使用する管理者用クライアント（ユーザー作成等の権限を持つ）
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
