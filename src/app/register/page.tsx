'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createHeadquartersAccount } from '@/app/actions/registerAdmin';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await createHeadquartersAccount(formData);

    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }

    alert('本部アカウントの登録が完了しました！');
    
    // サインアップ後はログイン画面に戻る（AdminAPIで作成した場合は自動ログインされないため）
    router.push('/'); 
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>新規店舗登録</h1>
          <p>最初の店長アカウントを作成</p>
        </div>
        
        <form onSubmit={handleRegister} className="login-form">
          <div className="form-group">
            <label>店舗名</label>
            <input 
              type="text" 
              value={storeName} 
              onChange={e => setStoreName(e.target.value)} 
              placeholder="○○カフェ 新宿店"
              required 
            />
          </div>
          <div className="form-group">
            <label>あなたの名前（店長）</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="山田 太郎"
              required 
            />
          </div>
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
            <label>パスワード (6文字以上)</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登録中...' : '登録して始める'}
          </button>
        </form>
        
        <div className="login-footer">
          <Link href="/">← ログイン画面に戻る</Link>
        </div>
      </div>
    </div>
  );
}
