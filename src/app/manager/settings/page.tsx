'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createStoreAccount, updateStoreDetailsAndAccount, deleteStore } from '@/app/actions/store';

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
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`本当に「${storeName}」を削除しますか？\n\n【⚠️警告】この操作は取り消せません。\nこの店舗に所属する全スタッフのアカウント、シフトデータ、TODOなどすべての関連データが完全に削除されます。`)) {
      return;
    }
    
    setDeleting(true);
    const result = await deleteStore(storeId);
    
    if (result.error) {
      alert(result.error);
    } else {
      alert('店舗を削除しました。');
      setEditingStoreId(null);
      fetchStores();
    }
    setDeleting(false);
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}>読み込み中...</div>;
  }

  const filteredStores = stores.filter(store => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = store.StoreName?.toLowerCase().includes(query) || false;
    const loginIdMatch = store.LoginId?.toLowerCase().includes(query) || false;
    return nameMatch || loginIdMatch;
  });

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        店舗設定・管理
      </h1>

      {/* 新規店舗の追加（本部・管理者のみ） */}
      {isSuperAdmin && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', color: 'var(--text-main)', borderLeft: '4px solid var(--primary-color)', paddingLeft: '8px' }}>🏢 新規店舗の登録</h2>
          <form onSubmit={handleAddStore} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>店舗名 <span style={{ backgroundColor: 'var(--error-color)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>必須</span></label>
              <input type="text" name="storeName" required placeholder="例: 渋谷店" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>営業時間 <span style={{ backgroundColor: '#ddd', color: '#555', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>任意</span></label>
              <input type="text" name="businessHours" placeholder="例: 10:00〜20:00" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>ログインID <span style={{ backgroundColor: 'var(--error-color)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>必須</span></label>
              <input type="text" name="loginId" required placeholder="shibuya" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>初期パスワード（6文字以上） <span style={{ backgroundColor: 'var(--error-color)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>必須</span></label>
              <input type="text" name="password" required minLength={6} placeholder="password123" />
            </div>
            <button type="submit" disabled={adding} className="btn-primary" style={{ marginTop: '16px' }}>
              {adding ? '登録中...' : '店舗とアカウントを追加する'}
            </button>
          </form>
        </div>
      )}

      {/* 登録済み店舗一覧 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)', borderLeft: '4px solid var(--primary-color)', paddingLeft: '8px' }}>
            登録されている店舗一覧 ({filteredStores.length}店舗)
          </h2>
          <input 
            type="text" 
            placeholder="店舗名やログインIDで検索..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', backgroundColor: '#fff', minWidth: '250px' }}
          />
        </div>
        
        {filteredStores.length === 0 ? (
          <p style={{ color: 'var(--text-sub)' }}>該当する店舗が見つかりません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredStores.map((store) => (
              <div key={store.StoreID} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
                {editingStoreId === store.StoreID ? (
                  // 編集モード
                  <form onSubmit={handleUpdateStore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-body)', borderRadius: 'var(--border-radius)' }}>
                      <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-main)' }}>📝 基本情報の編集</h4>
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label>店舗名</label>
                        <input type="text" name="storeName" value={editStoreName} onChange={e => setEditStoreName(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>営業時間</label>
                        <textarea name="businessHours" value={editBusinessHours} onChange={e => setEditBusinessHours(e.target.value)} rows={2} />
                      </div>
                    </div>
                    
                    <div style={{ padding: '16px', backgroundColor: '#FFF0F0', borderRadius: 'var(--border-radius)' }}>
                      <h4 style={{ margin: '0 0 16px 0', color: 'var(--error-color)' }}>🔑 ログイン情報の変更</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-sub)', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                        ※変更しない場合は空欄のままにしてください。<br/>
                        現在のログインID: <strong style={{ color: '#000' }}>{store.LoginId || '未設定'}</strong><br/>
                        現在のパスワード: <strong style={{ color: '#000' }}>{store.LoginPassword || '未設定'}</strong>
                      </p>
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ color: 'var(--error-color)' }}>新しいログインID</label>
                        <input type="text" name="loginId" placeholder="変更しない場合は空欄" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ color: 'var(--error-color)' }}>新しいパスワード（6文字以上）</label>
                        <input type="text" name="password" minLength={6} placeholder="変更しない場合は空欄" />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, boxShadow: 'none' }}>保存する</button>
                      <button type="button" onClick={() => setEditingStoreId(null)} style={{ flex: 1, padding: '14px', backgroundColor: 'var(--bg-input)', border: 'none', borderRadius: '27px', color: 'var(--text-sub)', cursor: 'pointer', fontWeight: 'bold' }}>キャンセル</button>
                    </div>
                  </form>
                ) : (
                  // 表示モード
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', color: 'var(--text-main)' }}>{store.StoreName}</h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {store.BusinessHours ? `営業時間: ${store.BusinessHours}` : '営業時間: 未設定'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEditing(store)} disabled={deleting} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', border: 'none', borderRadius: '24px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                        編集
                      </button>
                      <button onClick={() => handleDeleteStore(store.StoreID, store.StoreName)} disabled={deleting} style={{ padding: '8px 16px', backgroundColor: '#FFF0F0', color: 'var(--error-color)', border: 'none', borderRadius: '24px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                        削除
                      </button>
                    </div>
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
