'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // IDがメールアドレス形式でない場合は、ダミーのドメインを付与する
    const loginEmail = loginId.includes('@') ? loginId : `${loginId}@shift.local`;

    // Supabaseの認証機能でログイン
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password 
    });
    
    if (error) {
      alert('ログインに失敗しました: ' + error.message);
      setLoading(false);
      return;
    }

    // ログイン成功後、データベースから「店長」か「スタッフ」かを確認する
    // Usersテーブルから権限（Role）とステータス（Status）を取得
    const { data: userData, error: userError } = await supabase
      .from('Users')
      .select('Role, Status')
      .eq('UserID', data.user.id)
      .maybeSingle();

    if (userError || !userData) {
      alert('ログインに成功しましたが、ユーザー情報が見つかりません。（Usersテーブルから削除されている可能性があります）');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (userData.Status === '無効') {
      alert('このアカウントは現在無効化されています。管理者にお問い合わせください。');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (userData.Role === 'スタッフ') {
      router.push('/staff');
    } else {
      router.push('/manager');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>シフト管理アプリ</h1>
          <p>スタッフ・店長ログイン</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>ログインID</label>
            <input 
              type="text" 
              value={loginId} 
              onChange={e => setLoginId(e.target.value)} 
              placeholder="ログインID または メールアドレス"
              required 
            />
          </div>
          <div className="form-group">
            <label>パスワード</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
