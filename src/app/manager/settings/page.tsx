'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function StoreSettingsPage() {
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // 1. ログインしている店長のユーザーIDを取得
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    // 2. 店長のプロフィールからStoreIDを取得
    const { data: userProfile } = await supabase
      .from('Users')
      .select('StoreID')
      .eq('UserID', authData.user.id)
      .single();

    if (userProfile && userProfile.StoreID) {
      setStoreId(userProfile.StoreID);

      // 3. 店舗設定テーブル(StoreSettings)から情報を取得
      const { data: storeData } = await supabase
        .from('StoreSettings')
        .select('*')
        .eq('StoreID', userProfile.StoreID)
        .single();

      if (storeData) {
        setStoreName(storeData.StoreName || '');
        setBusinessHours(storeData.BusinessHours || '');
      }
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (!storeId) {
      alert('エラー: 店舗IDが見つかりません');
      setSaving(false);
      return;
    }

    // 店舗情報を更新 (StoreSettingsテーブル)
    const { error } = await supabase
      .from('StoreSettings')
      .update({
        StoreName: storeName,
        BusinessHours: businessHours
      })
      .eq('StoreID', storeId);

    if (error) {
      alert('保存エラー: ' + error.message);
    } else {
      alert('店舗情報を保存しました！');
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
        店舗設定
      </h1>

      <div style={{ backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>基本情報の登録・編集</h2>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
              店舗名
            </label>
            <input 
              type="text" 
              value={storeName} 
              onChange={e => setStoreName(e.target.value)} 
              placeholder="例: 〇〇カフェ 新宿店" 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }} 
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
              営業時間
            </label>
            <textarea 
              value={businessHours} 
              onChange={e => setBusinessHours(e.target.value)} 
              placeholder="例: 平日 10:00〜22:00 / 休日 09:00〜23:00" 
              rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', resize: 'vertical' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={saving} 
            style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--primary-color)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '1rem',
              cursor: 'pointer', 
              marginTop: '1rem' 
            }}>
            {saving ? '保存中...' : '店舗情報を保存する'}
          </button>
        </form>
      </div>
    </div>
  );
}
