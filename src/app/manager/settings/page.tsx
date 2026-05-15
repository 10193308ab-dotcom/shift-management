'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createStoreAccount, updateStoreDetailsAndAccount } from '@/app/actions/store';

export default function StoreSettingsPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
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

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    // 1. ログインユーザーの権限と所属店舗を取得
    const { data: managerProfile } = await supabase
      .from('Users')
      .select('Role, StoreID')
      .eq('UserID', authData.user.id)
      .single();

    if (!managerProfile) return;

    // 「本部」や「管理者」なら全店舗を見れるようにする。通常の「店長」は自店舗のみ。
    const superAdminCheck = managerProfile.Role === '本部' || managerProfile.Role === '管理者';
    setIsSuperAdmin(superAdminCheck);

    // 登録されている店舗を取得
    let storesQuery = supabase
      .from('StoreSettings')
      .select('*')
      .order('StoreName', { ascending: true });

    if (!superAdminCheck) {
      storesQuery = storesQuery.eq('StoreID', managerProfile.StoreID);
    }

    const { data: storeData } = await storesQuery;

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

      {/* 新規店舗の追加（本部・管理者のみ） */}
      {isSuperAdmin && (
        <div style={{ backgroundColor: '#FFFDF0', padding: '1.5rem', borderRadius: '16px', border: '1px solid #FFE066', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#B38F00' }}>🏢 新規店舗の登録</h2>
          <form onSubmit={handleAddStore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>店舗名</label>
              <input type="text" name="storeName" required placeholder="例: 渋谷店" style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: '#fff' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>営業時間</label>
              <input type="text" name="businessHours" placeholder="例: 10:00〜20:00" style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: '#fff' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>ログインID</label>
              <input type="text" name="loginId" required placeholder="shibuya" style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: '#fff' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>初期パスワード（6文字以上）</label>
              <input type="text" name="password" required minLength={6} placeholder="password123" style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: '#fff' }} />
            </div>
            <button type="submit" disabled={adding} style={{ padding: '0.8rem', backgroundColor: 'var(--primary-color)', color: '#333', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem', boxShadow: '0 2px 8px rgba(255, 204, 0, 0.3)' }}>
              {adding ? '登録中...' : '店舗とアカウントを追加する'}
            </button>
          </form>
        </div>
      )}

      {/* 登録済み店舗一覧 */}
      <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-color)' }}>登録されている店舗一覧 ({stores.length}店舗)</h2>
        
        {stores.length === 0 ? (
          <p style={{ color: '#8e8e93' }}>店舗が登録されていません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stores.map((store) => (
              <div key={store.StoreID} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#F9F9FB' }}>
                {editingStoreId === store.StoreID ? (
                  // 編集モード
                  <form onSubmit={handleUpdateStore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>📝 基本情報の編集</h4>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>店舗名</label>
                        <input type="text" name="storeName" value={editStoreName} onChange={e => setEditStoreName(e.target.value)} required style={{ width: '100%', padding: '0.8rem', marginTop: '0.3rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>営業時間</label>
                        <textarea name="businessHours" value={editBusinessHours} onChange={e => setEditBusinessHours(e.target.value)} rows={2} style={{ width: '100%', padding: '0.8rem', marginTop: '0.3rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'inherit' }} />
                      </div>
                    </div>
                    
                    <div style={{ padding: '1.5rem', backgroundColor: '#FFFDF0', borderRadius: '12px', border: '1px solid #FFE066' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#B38F00' }}>🔑 ログイン情報の変更</h4>
                      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
                        ※変更しない場合は空欄のままにしてください。<br/>
                        現在のログインID: <strong style={{ color: '#000' }}>{store.LoginId || '未設定'}</strong><br/>
                        現在のパスワード: <strong style={{ color: '#000' }}>{store.LoginPassword || '未設定'}</strong>
                      </p>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#B38F00' }}>新しいログインID</label>
                        <input type="text" name="loginId" placeholder="変更しない場合は空欄" style={{ width: '100%', padding: '0.8rem', marginTop: '0.3rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#B38F00' }}>新しいパスワード（6文字以上）</label>
                        <input type="text" name="password" minLength={6} placeholder="変更しない場合は空欄" style={{ width: '100%', padding: '0.8rem', marginTop: '0.3rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'var(--primary-color)', color: '#333', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(255, 204, 0, 0.3)' }}>保存する</button>
                      <button type="button" onClick={() => setEditingStoreId(null)} style={{ flex: 1, padding: '0.8rem', backgroundColor: '#F5F5F5', border: '1px solid var(--border-color)', borderRadius: '50px', color: '#333', cursor: 'pointer', fontWeight: 'bold' }}>キャンセル</button>
                    </div>
                  </form>
                ) : (
                  // 表示モード
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>{store.StoreName}</h3>
                      <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {store.BusinessHours ? `営業時間: ${store.BusinessHours}` : '営業時間: 未設定'}
                      </p>
                    </div>
                    <button onClick={() => startEditing(store)} style={{ padding: '0.5rem 1rem', backgroundColor: '#F5F5F5', color: '#333', border: '1px solid var(--border-color)', borderRadius: '50px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
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
