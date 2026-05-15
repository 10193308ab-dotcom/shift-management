'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createStaffAccount } from '@/app/actions/staff';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
    const isSuperAdmin = managerProfile.Role === '本部' || managerProfile.Role === '管理者';

    // 店舗一覧を取得
    let storesQuery = supabase.from('StoreSettings').select('StoreID, StoreName');
    if (!isSuperAdmin) {
      storesQuery = storesQuery.eq('StoreID', managerProfile.StoreID);
    }
    const { data: storesData } = await storesQuery;
    
    if (storesData) {
      setStores(storesData);
      if (storesData.length > 0) {
        setSelectedStoreId(storesData[0].StoreID);
      }
    }

    // スタッフを取得
    let staffQuery = supabase
      .from('Users')
      .select('*, StoreSettings(StoreName)')
      .eq('Role', 'スタッフ')
      .order('RegistrationDate', { ascending: false });
      
    if (!isSuperAdmin) {
      staffQuery = staffQuery.eq('StoreID', managerProfile.StoreID);
    }
    
    const { data: staffData } = await staffQuery;

    if (staffData) {
      setStaffList(staffData);
    }
    setLoading(false);
  };

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('storeId', selectedStoreId);

    const result = await createStaffAccount(formData);

    if (result.error) {
      alert(result.error);
    } else {
      alert('スタッフの登録が完了しました！作成したIDとパスワードを本人にお伝えください。');
      // @ts-ignore
      e.target.reset();
      fetchData(); // リストを再取得
    }
    setSubmitLoading(false);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
        スタッフ管理
      </h1>

      <div style={{ backgroundColor: '#eaf4ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #cce4ff', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#005bb5' }}>👤 新規スタッフの登録</h2>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          ここで作成した「メールアドレス」と「パスワード」を本人に伝え、ログイン画面のURLを共有してください。
        </p>
        
        <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>所属店舗</label>
            <select 
              value={selectedStoreId} 
              onChange={e => setSelectedStoreId(e.target.value)}
              required 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {stores.map(store => (
                <option key={store.StoreID} value={store.StoreID}>{store.StoreName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>スタッフの名前</label>
            <input type="text" name="name" required placeholder="山田 太郎" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>ログインID</label>
            <input type="text" name="loginId" required placeholder="yamada123" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>初期パスワード（6文字以上）</label>
            <input type="text" name="password" required minLength={6} placeholder="password123" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <button type="submit" disabled={submitLoading || stores.length === 0} style={{ padding: '0.75rem', backgroundColor: '#005bb5', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}>
            {submitLoading ? '登録中...' : 'スタッフを登録する'}
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>登録済みスタッフ一覧 ({staffList.length}名)</h2>
        
        {loading ? (
          <p>読み込み中...</p>
        ) : staffList.length === 0 ? (
          <p style={{ color: '#8e8e93' }}>まだスタッフが登録されていません。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>名前</th>
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>ログインID</th>
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>初期パスワード</th>
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>所属店舗</th>
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>ステータス</th>
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>登録日</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.UserID} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{staff.Name}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{staff.LoginId || '未設定'}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#c5221f' }}>{staff.LoginPassword || '未設定'}</td>
                    <td style={{ padding: '0.75rem' }}>{staff.StoreSettings?.StoreName || '未所属'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem',
                        backgroundColor: staff.Status === '有効' ? '#e6f4ea' : '#fce8e6',
                        color: staff.Status === '有効' ? '#137333' : '#c5221f'
                      }}>
                        {staff.Status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                      {new Date(staff.RegistrationDate).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
