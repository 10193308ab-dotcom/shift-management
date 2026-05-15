'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { updateShiftStatus } from '@/app/actions/shift';

export default function ManagerShiftsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル用ステート
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // シフト調整用ステート
  const [adjustingShiftId, setAdjustingShiftId] = useState<string | null>(null);
  const [adjustStart, setAdjustStart] = useState('');
  const [adjustEnd, setAdjustEnd] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    
    const { data: managerProfile } = await supabase
      .from('Users')
      .select('StoreID')
      .eq('UserID', authData.user.id)
      .single();
      
    if (managerProfile) {
      // 自店舗の全スタッフを取得
      const { data: storeUsers } = await supabase
        .from('Users')
        .select('UserID, Name')
        .eq('StoreID', managerProfile.StoreID)
        .eq('Role', 'スタッフ');
        
      if (storeUsers && storeUsers.length > 0) {
        const userIds = storeUsers.map(u => u.UserID);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const { data: shiftsData } = await supabase
          .from('Shifts')
          .select('*')
          .in('UserID', userIds)
          .gte('Date', firstDay)
          .lte('Date', lastDay)
          .order('StartTime', { ascending: true });

        if (shiftsData) {
          const formattedShifts = shiftsData.map(shift => {
            const user = storeUsers.find(u => u.UserID === shift.UserID);
            return {
              ...shift,
              UserName: user ? user.Name : '不明'
            };
          });
          setShifts(formattedShifts);
        }
      } else {
        setShifts([]); // スタッフがいない場合
      }
    }
    setLoading(false);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array(firstDay).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getShiftsForDate = (dateStr: string) => shifts.filter(s => s.Date === dateStr);

  const handleStatusChange = async (shiftId: string, status: '承認済' | '却下' | '調整済', start?: string, end?: string) => {
    setActionLoading(true);
    const result = await updateShiftStatus(shiftId, status, start, end);
    if (result.error) {
      alert(result.error);
    } else {
      setAdjustingShiftId(null);
      await fetchData(); // 再取得して画面を更新
    }
    setActionLoading(false);
  };

  const openAdjustMode = (shift: any) => {
    setAdjustingShiftId(shift.ShiftID);
    setAdjustStart(shift.StartTime.slice(0, 5));
    setAdjustEnd(shift.EndTime.slice(0, 5));
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
        シフト承認ダッシュボード
      </h1>

      <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>◀</button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{year}年 {month + 1}月</h2>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>▶</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'var(--border-color)' }}>
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} style={{ backgroundColor: '#f9f9fb', padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {day}
            </div>
          ))}
          
          {days.map((day, index) => {
            if (!day) return <div key={index} style={{ backgroundColor: '#fafafa' }} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayShifts = getShiftsForDate(dateStr);
            const pendingCount = dayShifts.filter(s => s.Status === '申請中').length;
            const approvedCount = dayShifts.filter(s => s.Status === '承認済' || s.Status === '調整済').length;

            return (
              <div 
                key={index} 
                onClick={() => setSelectedDate(dateStr)}
                style={{ 
                  backgroundColor: 'var(--surface-color)', 
                  minHeight: '100px', 
                  padding: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f4f8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-color)'}
              >
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold', color: (index % 7 === 0) ? '#c5221f' : (index % 7 === 6) ? '#1967d2' : '#333' }}>
                  {day}
                </div>
                
                {/* 申請中バッジ */}
                {pendingCount > 0 && (
                  <div style={{ fontSize: '0.7rem', padding: '4px', borderRadius: '4px', backgroundColor: '#fef7e0', color: '#b06000', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    申請中 {pendingCount}件
                  </div>
                )}
                {/* 承認済バッジ */}
                {approvedCount > 0 && (
                  <div style={{ fontSize: '0.7rem', padding: '4px', borderRadius: '4px', backgroundColor: '#e6f4ea', color: '#137333', textAlign: 'center' }}>
                    承認済 {approvedCount}件
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* モーダル表示 */}
      {selectedDate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{selectedDate.replace(/-/g, '/')} のシフト一覧</h2>
              <button onClick={() => { setSelectedDate(null); setAdjustingShiftId(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {getShiftsForDate(selectedDate).length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>この日のシフト申請はありません。</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {getShiftsForDate(selectedDate).map(shift => (
                    <div key={shift.ShiftID} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem', backgroundColor: shift.Status === '申請中' ? '#fffbfa' : '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem' }}>{shift.UserName}</h3>
                          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>
                            {shift.StartTime.slice(0, 5)} - {shift.EndTime.slice(0, 5)}
                          </p>
                        </div>
                        <span style={{ 
                          fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '20px', fontWeight: 'bold',
                          backgroundColor: shift.Status === '承認済' ? '#e6f4ea' : shift.Status === '申請中' ? '#fef7e0' : shift.Status === '調整済' ? '#e8f0fe' : '#fce8e6',
                          color: shift.Status === '承認済' ? '#137333' : shift.Status === '申請中' ? '#b06000' : shift.Status === '調整済' ? '#1967d2' : '#c5221f'
                        }}>
                          {shift.Status}
                        </span>
                      </div>

                      {/* アクションボタン群 */}
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {adjustingShiftId === shift.ShiftID ? (
                          // 調整モード
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', backgroundColor: '#e8f0fe', borderRadius: '8px' }}>
                            <input type="time" value={adjustStart} onChange={e => setAdjustStart(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                            <span>〜</span>
                            <input type="time" value={adjustEnd} onChange={e => setAdjustEnd(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                            <button disabled={actionLoading} onClick={() => handleStatusChange(shift.ShiftID, '調整済', adjustStart, adjustEnd)} style={{ padding: '0.5rem 1rem', backgroundColor: '#1967d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>決定</button>
                            <button onClick={() => setAdjustingShiftId(null)} style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
                          </div>
                        ) : (
                          // 通常のアクションボタン
                          <>
                            {shift.Status !== '承認済' && (
                              <button disabled={actionLoading} onClick={() => handleStatusChange(shift.ShiftID, '承認済')} style={{ flex: 1, padding: '0.6rem', backgroundColor: '#137333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                承認する
                              </button>
                            )}
                            {shift.Status !== '却下' && (
                              <button disabled={actionLoading} onClick={() => handleStatusChange(shift.ShiftID, '却下')} style={{ flex: 1, padding: '0.6rem', backgroundColor: '#fff', color: '#c5221f', border: '1px solid #c5221f', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                却下する
                              </button>
                            )}
                            <button onClick={() => openAdjustMode(shift)} style={{ flex: 1, padding: '0.6rem', backgroundColor: '#fff', color: '#1967d2', border: '1px solid #1967d2', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                              時間調整
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
