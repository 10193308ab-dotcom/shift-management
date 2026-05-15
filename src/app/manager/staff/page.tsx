'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    // 1. 店長のプロフィールと店舗情報を取得
    const { data: managerProfile } = await supabase
      .from('Users')
      .select('StoreID, StoreSettings(InviteCode)')
      .eq('UserID', authData.user.id)
      .single();

    if (managerProfile) {
      // @ts-ignore
      setInviteCode(managerProfile.StoreSettings?.InviteCode || '未設定');

      // 2. この店舗のスタッフ一覧を取得
      const { data: staffData } = await supabase
        .from('Users')
        .select('*')
        .eq('StoreID', managerProfile.StoreID)
        .eq('Role', 'スタッフ')
        .order('RegistrationDate', { ascending: false });

      if (staffData) {
        setStaffList(staffData);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
        スタッフ管理
      </h1>

      <div style={{ backgroundColor: '#eaf4ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #cce4ff', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#005bb5' }}>🚀 新規スタッフの招待</h2>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          新しいスタッフを登録するには、以下の「招待コード」をスタッフに伝えて、ログイン画面から登録してもらってください。
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fff', padding: '0.5rem 1rem', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px', border: '2px dashed var(--primary-color)', borderRadius: '8px' }}>
            {inviteCode}
          </div>
        </div>
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
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>ステータス</th>
                  <th style={{ padding: '0.75rem', color: '#8e8e93' }}>登録日</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.UserID} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{staff.Name}</td>
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
