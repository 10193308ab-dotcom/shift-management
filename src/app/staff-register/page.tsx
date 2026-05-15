'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StaffRegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. 招待コードの確認
    const { data: storeData, error: storeError } = await supabase
      .from('StoreSettings')
      .select('StoreID, StoreName')
      .eq('InviteCode', inviteCode)
      .single();

    if (storeError || !storeData) {
      alert('無効な招待コードです。店長にご確認ください。');
      setLoading(false);
      return;
    }

    // 2. Supabase Authでユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
      email, 
      password 
    });
    
    if (authError || !authData.user) {
      alert('登録エラー(Auth): ' + (authError?.message || '不明なエラー'));
      setLoading(false);
      return;
    }

    // 3. ユーザープロフィールの作成（スタッフとして登録）
    const { error: userError } = await supabase
      .from('Users')
      .insert([{ 
        UserID: authData.user.id, 
        StoreID: storeData.StoreID, 
        Name: name, 
        Role: 'スタッフ' 
      }]);

    if (userError) {
      alert('プロフィール作成エラー: ' + userError.message);
      setLoading(false);
      return;
    }

    alert(`「${storeData.StoreName}」のスタッフとして登録されました！`);
    router.push('/staff'); 
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>スタッフ登録</h1>
          <p>店長から教えられた招待コードを入力してください</p>
        </div>
        
        <form onSubmit={handleRegister} className="login-form">
          <div className="form-group">
            <label>招待コード</label>
            <input 
              type="text" 
              value={inviteCode} 
              onChange={e => setInviteCode(e.target.value)} 
              placeholder="例: a1b2c3d4"
              required 
            />
          </div>
          <div className="form-group">
            <label>あなたの名前</label>
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
