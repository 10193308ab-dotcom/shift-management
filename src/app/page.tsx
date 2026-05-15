'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Supabaseの認証機能でログイン
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('ログインに失敗しました: ' + error.message);
      setLoading(false);
      return;
    }

    // ログイン成功時の処理（とりあえずスタッフ画面へ遷移）
    router.push('/staff'); 
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
            <label>メールアドレス</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="example@example.com"
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
        
        <div className="login-footer">
          <p>※アカウントがない場合は店長に招待コードを発行してもらってください。</p>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Link href="/register" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
              💡 新しく店舗を登録する（店長用）
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
