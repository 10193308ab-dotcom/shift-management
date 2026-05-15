'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function StaffCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    
    const { data: userProfile } = await supabase
      .from('Users')
      .select('*')
      .eq('UserID', authData.user.id)
      .single();
      
    if (userProfile) {
      setCurrentUser(userProfile);
      
      const { data: storeUsers } = await supabase
        .from('Users')
        .select('UserID, Name')
        .eq('StoreID', userProfile.StoreID);
        
      if (storeUsers) {
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
          .lte('Date', lastDay);

        if (shiftsData) {
          const formattedShifts = shiftsData.map(shift => {
            const user = storeUsers.find(u => u.UserID === shift.UserID);
            return {
              ...shift,
              UserName: user ? user.Name : '不明',
              isMine: shift.UserID === userProfile.UserID
            };
          });
          setShifts(formattedShifts);
        }
      }
    }
    setLoading(false);
  };

  // カレンダーの日付生成ロジック
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  // 空白のパディング
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // 日付
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getShiftsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // 自分のシフトだけをフィルタリング
    return shifts.filter(s => s.Date === dateStr && s.UserID === currentUser?.UserID);
  };

  const [selectedShiftDate, setSelectedShiftDate] = useState<string | null>(null);
  const selectedShifts = selectedShiftDate ? getShiftsForDate(parseInt(selectedShiftDate.split('-')[2])) : [];

  return (
    <div style={{ margin: '0 -0.5rem', padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>シフトカレンダー</h1>
        <Link href="/staff/apply" className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          ＋ シフト申請
        </Link>
      </div>

      <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>◀</button>
          <h2 style={{ fontSize: '1.2rem' }}>{year}年 {month + 1}月</h2>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>▶</button>
        </div>

        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'var(--border-color)' }}>
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} style={{ backgroundColor: '#f9f9fb', padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {day}
            </div>
          ))}
          
          {days.map((day, index) => {
            const dayShifts = day ? getShiftsForDate(day) : [];
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
            return (
              <div 
                key={index} 
                onClick={() => {
                  if (dayShifts.length > 0 && dateStr) {
                    setSelectedShiftDate(dateStr);
                  }
                }}
                style={{ 
                  backgroundColor: 'var(--surface-color)', 
                  minHeight: '100px', 
                  padding: '0.5rem',
                  cursor: dayShifts.length > 0 ? 'pointer' : 'default'
                }}
              >
                {day && (
                  <>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: (index % 7 === 0) ? 'red' : (index % 7 === 6) ? 'blue' : 'inherit' }}>
                      {day}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayShifts.map(shift => {
                        // シンプルなバッジ表示（確定・申請中）
                        const isConfirmed = shift.Status === '承認済' || shift.Status === '調整済';
                        const isPending = shift.Status === '申請中';
                        if (!isConfirmed && !isPending) return null; // 却下は表示しないか、シンプルにする

                        let bgColor = '#f0f0f0';
                        let color = '#333';
                        let label = shift.Status;

                        if (isConfirmed) { 
                          bgColor = '#e6f4ea'; color = '#137333'; label = '確定'; 
                        } else if (isPending) { 
                          bgColor = '#fef7e0'; color = '#b06000'; label = '申請中'; 
                        }

                        return (
                          <div key={shift.ShiftID} style={{ 
                            fontSize: '0.8rem', 
                            padding: '4px', 
                            borderRadius: '4px', 
                            backgroundColor: bgColor, 
                            color: color, 
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* モーダル表示 */}
      {selectedShiftDate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{selectedShiftDate.replace(/-/g, '/')} のシフト</h2>
              <button onClick={() => setSelectedShiftDate(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {selectedShifts.map(shift => {
                const isAdjusted = shift.Status === '調整済';
                return (
                  <div key={shift.ShiftID} style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        backgroundColor: (shift.Status === '承認済' || shift.Status === '調整済') ? '#e6f4ea' : '#fef7e0',
                        color: (shift.Status === '承認済' || shift.Status === '調整済') ? '#137333' : '#b06000'
                      }}>
                        {(shift.Status === '承認済' || shift.Status === '調整済') ? '確定' : shift.Status}
                      </span>
                    </div>
                    
                    {isAdjusted ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}>自分が提出した時間</span>
                          <div style={{ fontSize: '1.1rem', color: '#888', textDecoration: 'line-through' }}>
                            {shift.OriginalStartTime?.slice(0, 5)} - {shift.OriginalEndTime?.slice(0, 5)}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: '#1967d2', fontWeight: 'bold' }}>調整後の時間</span>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                            {shift.StartTime.slice(0, 5)} - {shift.EndTime.slice(0, 5)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                        {shift.StartTime.slice(0, 5)} - {shift.EndTime.slice(0, 5)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
              <button onClick={() => setSelectedShiftDate(null)} style={{ padding: '0.5rem 2rem', backgroundColor: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
