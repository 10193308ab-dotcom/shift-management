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

  // 日付ごとのシフトを取得
  const getShiftsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.filter(s => s.Date === dateStr);
  };

  return (
    <div className="container" style={{ padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
            return (
              <div key={index} style={{ backgroundColor: 'var(--surface-color)', minHeight: '100px', padding: '0.5rem' }}>
                {day && (
                  <>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: (index % 7 === 0) ? 'red' : (index % 7 === 6) ? 'blue' : 'inherit' }}>
                      {day}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayShifts.map(shift => {
                        // 他人のシフトで、承認済/調整済以外は非表示
                        if (!shift.isMine && shift.Status !== '承認済' && shift.Status !== '調整済') return null;
                        
                        // ステータスごとの色分け
                        let bgColor = '#f0f0f0';
                        let color = '#333';
                        if (shift.Status === '承認済') { bgColor = '#e6f4ea'; color = '#137333'; }
                        if (shift.Status === '申請中') { bgColor = '#fef7e0'; color = '#b06000'; }
                        if (shift.Status === '却下') { bgColor = '#fce8e6'; color = '#c5221f'; }
                        if (shift.Status === '調整済') { bgColor = '#e8f0fe'; color = '#1967d2'; }

                        return (
                          <div key={shift.ShiftID} style={{ fontSize: '0.7rem', padding: '4px', borderRadius: '4px', backgroundColor: bgColor, color: color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {shift.isMine ? '自分' : shift.UserName} ({shift.StartTime.slice(0,5)}-{shift.EndTime.slice(0,5)})
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
    </div>
  );
}
