'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createStaffAccount } from '@/app/actions/staff';
import { UserPlus } from 'lucide-react';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedFilterStoreId, setSelectedFilterStoreId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHeadquarters, setIsHeadquarters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedFilterStoreId]);

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
    setIsHeadquarters(isSuperAdmin);

    // 店舗一覧を取得
    let storesQuery = supabase.from('StoreSettings').select('StoreID, StoreName');
    if (!isSuperAdmin) {
      storesQuery = storesQuery.eq('StoreID', managerProfile.StoreID);
    }
    const { data: storesData } = await storesQuery;
    
    if (storesData) {
      setStores(storesData);
      // form dropdown の初期値
      if (storesData.length > 0 && !selectedStoreId) {
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
    } else {
      if (selectedFilterStoreId !== 'all') {
        staffQuery = staffQuery.eq('StoreID', selectedFilterStoreId);
      }
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

  const toggleStaffStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === '有効' ? '無効' : '有効';
    const confirmMessage = newStatus === '無効' 
      ? 'このスタッフのアカウントを無効にしますか？\n（無効化するとログインできなくなります）'
      : 'このスタッフのアカウントを有効にしますか？\n（再度ログインできるようになります）';
      
    if (!confirm(confirmMessage)) return;

    // Supabase上のステータスを更新
    const { error } = await supabase
      .from('Users')
      .update({ Status: newStatus })
      .eq('UserID', userId);

    if (error) {
      alert('ステータスの変更に失敗しました: ' + error.message);
      return;
    }

    // ローカルのステートを更新
    setStaffList(prev => prev.map(staff => 
      staff.UserID === userId ? { ...staff, Status: newStatus } : staff
    ));
  };

  const filteredStaffList = staffList.filter(staff => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = staff.Name?.toLowerCase().includes(query) || false;
    const loginIdMatch = staff.LoginId?.toLowerCase().includes(query) || false;
    return nameMatch || loginIdMatch;
  });

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        スタッフ管理
      </h1>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', color: 'var(--text-main)', borderLeft: '4px solid var(--primary-color)', paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={20} /> 新規スタッフの登録
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '16px' }}>
          ここで作成した「メールアドレス」と「パスワード」を本人に伝え、ログイン画面のURLを共有してください。
        </p>
        
        <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>所属店舗 <span style={{ backgroundColor: 'var(--error-color)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>必須</span></label>
            <select 
              value={selectedStoreId} 
              onChange={e => setSelectedStoreId(e.target.value)}
              required 
            >
              {stores.map(store => (
                <option key={store.StoreID} value={store.StoreID}>{store.StoreName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>スタッフの名前 <span style={{ backgroundColor: 'var(--error-color)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>必須</span></label>
            <input type="text" name="name" required placeholder="山田 太郎" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>ログインID <span style={{ backgroundColor: 'var(--error-color)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>必須</span></label>
            <input type="text" name="loginId" required placeholder="yamada123" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>初期パスワード（6文字以上） <span style={{ backgroundColor: 'var(--error-color)', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>必須</span></label>
            <input type="text" name="password" required minLength={6} placeholder="password123" />
          </div>
          <button type="submit" disabled={submitLoading || stores.length === 0} className="btn-primary" style={{ marginTop: '16px' }}>
            {submitLoading ? '登録中...' : 'スタッフを登録する'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)', borderLeft: '4px solid var(--primary-color)', paddingLeft: '8px' }}>
            登録済みスタッフ一覧 ({filteredStaffList.length}名)
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="名前やIDで検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', backgroundColor: '#fff', minWidth: '200px' }}
            />
            {isHeadquarters && (
              <select
                value={selectedFilterStoreId}
                onChange={(e) => setSelectedFilterStoreId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                <option value="all">全店舗のスタッフ</option>
                {stores.map(store => (
                  <option key={store.StoreID} value={store.StoreID}>{store.StoreName}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        {loading ? (
          <p>読み込み中...</p>
        ) : staffList.length === 0 ? (
          <p style={{ color: 'var(--text-sub)' }}>まだスタッフが登録されていません。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px', color: 'var(--text-sub)' }}>名前</th>
                  <th style={{ padding: '12px', color: 'var(--text-sub)' }}>ログインID</th>
                  <th style={{ padding: '12px', color: 'var(--text-sub)' }}>初期パスワード</th>
                  <th style={{ padding: '12px', color: 'var(--text-sub)' }}>所属店舗</th>
                  <th style={{ padding: '12px', color: 'var(--text-sub)' }}>ステータス</th>
                  <th style={{ padding: '12px', color: 'var(--text-sub)' }}>登録日</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaffList.map((staff) => (
                  <tr key={staff.UserID} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{staff.Name}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{staff.LoginId || '未設定'}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--error-color)' }}>{staff.LoginPassword || '未設定'}</td>
                    <td style={{ padding: '12px' }}>{staff.StoreSettings?.StoreName || '未所属'}</td>
                    <td style={{ padding: '12px' }}>
                      <button 
                        onClick={() => toggleStaffStatus(staff.UserID, staff.Status)}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: staff.Status === '有効' ? '#E7F9EE' : '#FFF0F0',
                          color: staff.Status === '有効' ? 'var(--success-color)' : 'var(--error-color)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                      >
                        {staff.Status}
                      </button>
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
