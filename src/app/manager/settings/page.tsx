'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createStoreAccount, updateStoreDetailsAndAccount } from '@/app/actions/store';

export default function StoreSettingsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 新規追加用
  const [adding, setAdding] = useState(false);

  // 編集用
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editBusinessHours, setEditBusinessHours] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    // 登録されている全ての店舗を取得
    const { data: storeData } = await supabase
      .from('StoreSettings')
      .select('*')
      .order('StoreName', { ascending: true });

    if (storeData) {
      setStores(storeData);
    }
    setLoading(false);
  };

  const handleAddStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdding(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await createStoreAccount(formData);

    if (result.error) {
      alert('追加エラー: ' + result.error);
    } else {
      alert('新しい店舗とログイン用アカウントを登録しました！');
      // @ts-ignore
      e.target.reset();
      fetchStores();
    }
    setAdding(false);
  };

  const startEditing = (store: any) => {
    setEditingStoreId(store.StoreID);
    setEditStoreName(store.StoreName);
    setEditBusinessHours(store.BusinessHours || '');
  };

  const handleUpdateStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStoreId) return;
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    formData.append('storeId', editingStoreId);

    const result = await updateStoreDetailsAndAccount(formData);

    if (result.error) {
      alert('保存エラー: ' + result.error);
    } else {
      alert('店舗情報を更新しました！');
      setEditingStoreId(null);
      fetchStores();
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
        店舗設定・管理
      </h1>

      {/* 新規店舗の追加 */}
      <div style={{ backgroundColor: '#eaf4ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #cce4ff', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#005bb5' }}>🏢 新規店舗の登録</h2>
        <form onSubmit={handleAddStore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>店舗名</label>
            <input type="text" name="storeName" required placeholder="例: 渋谷店" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>営業時間</label>
            <input type="text" name="businessHours" placeholder="例: 10:00〜20:00" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>ログインID</label>
            <input type="text" name="loginId" required placeholder="shibuya" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>初期パスワード（6文字以上）</label>
            <input type="text" name="password" required minLength={6} placeholder="password123" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <button type="submit" disabled={adding} style={{ padding: '0.75rem', backgroundColor: '#005bb5', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}>
            {adding ? '登録中...' : '店舗とアカウントを追加する'}
          </button>
        </form>
      </div>

      {/* 登録済み店舗一覧 */}
      <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>登録されている店舗一覧 ({stores.length}店舗)</h2>
        
        {stores.length === 0 ? (
          <p style={{ color: '#8e8e93' }}>店舗が登録されていません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stores.map((store) => (
              <div key={store.StoreID} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                {editingStoreId === store.StoreID ? (
                  // 編集モード
                  <form onSubmit={handleUpdateStore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#f9f9fb', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#555' }}>📝 基本情報の編集</h4>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>店舗名</label>
                        <input type="text" name="storeName" value={editStoreName} onChange={e => setEditStoreName(e.target.value)} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>営業時間</label>
                        <textarea name="businessHours" value={editBusinessHours} onChange={e => setEditBusinessHours(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                      </div>
                    </div>
                    
                    <div style={{ padding: '1rem', backgroundColor: '#fff0f0', borderRadius: '8px', border: '1px solid #ffcccb' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#c5221f' }}>🔑 ログイン情報の変更 (変更する場合のみ入力)</h4>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#c5221f' }}>新しいログインID</label>
                        <input type="text" name="loginId" placeholder="変更しない場合は空欄" style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#c5221f' }}>新しいパスワード（6文字以上）</label>
                        <input type="text" name="password" minLength={6} placeholder="変更しない場合は空欄" style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>保存する</button>
                      <button type="button" onClick={() => setEditingStoreId(null)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
                    </div>
                  </form>
                ) : (
                  // 表示モード
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>{store.StoreName}</h3>
                      <p style={{ fontSize: '0.9rem', color: '#555', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {store.BusinessHours ? `営業時間: ${store.BusinessHours}` : '営業時間: 未設定'}
                      </p>
                    </div>
                    <button onClick={() => startEditing(store)} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      編集
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
