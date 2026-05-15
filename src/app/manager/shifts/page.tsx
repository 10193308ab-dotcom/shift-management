'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { updateShiftStatus } from '@/app/actions/shift';

export default function ManagerShiftsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [storeUsers, setStoreUsers] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // 本部用ステート
  const [isHeadquarters, setIsHeadquarters] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  
  // モーダル用ステート
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // シフト調整用ステート
  const [adjustingShiftId, setAdjustingShiftId] = useState<string | null>(null);
  const [adjustStart, setAdjustStart] = useState('');
  const [adjustEnd, setAdjustEnd] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentDate, selectedStoreId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    
    const { data: userProfile } = await supabase
      .from('Users')
      .select('StoreID, Role')
      .eq('UserID', authData.user.id)
      .single();
      
    if (userProfile) {
      const isHQ = userProfile.Role === '本部' || userProfile.Role === '管理者';
      setIsHeadquarters(isHQ);

      let targetStoreId = userProfile.StoreID;

      if (isHQ) {
        const { data: storesData } = await supabase.from('StoreSettings').select('StoreID, StoreName');
        if (storesData && storesData.length > 0) {
          setStores(storesData);
          if (!selectedStoreId) {
             targetStoreId = storesData[0].StoreID;
             setSelectedStoreId(targetStoreId);
             setLoading(false);
             return; // useEffect will re-trigger with new selectedStoreId
          } else {
             targetStoreId = selectedStoreId;
          }
        }
      }

      if (targetStoreId) {
        // 自店舗(または選択した店舗)の全スタッフを取得
        const { data: storeUsersData } = await supabase
          .from('Users')
          .select('UserID, Name')
          .eq('StoreID', targetStoreId)
          .eq('Role', 'スタッフ');
          
        if (storeUsersData && storeUsersData.length > 0) {
          setStoreUsers(storeUsersData);
          const userIds = storeUsersData.map((u: any) => u.UserID);
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
              const user = storeUsersData.find((u: any) => u.UserID === shift.UserID);
              return {
                ...shift,
                UserName: user ? user.Name : '不明'
              };
            });
            setShifts(formattedShifts);
          }

          // 店舗のシフト要件を取得
          const { data: reqData } = await supabase
            .from('ShiftRequirements')
            .select('*')
            .eq('StoreID', targetStoreId);
          if (reqData) setRequirements(reqData);
        } else {
          setStoreUsers([]);
          setShifts([]); // スタッフがいない場合
          setRequirements([]);
        }
      }
    }
    setLoading(false);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const getDaysArray = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
    
    return Array.from({ length: 42 }, (_, i) => {
      const day = i - firstDay + 1;
      if (day <= 0) {
        return { 
          day: prevMonthDays + day, 
          month: month === 0 ? 12 : month, 
          year: month === 0 ? year - 1 : year,
          isCurrentMonth: false
        };
      } else if (day > daysInMonth) {
        return {
          day: day - daysInMonth,
          month: month === 11 ? 1 : month + 2,
          year: month === 11 ? year + 1 : year,
          isCurrentMonth: false
        };
      } else {
        return {
          day,
          month: month + 1,
          year,
          isCurrentMonth: true
        };
      }
    });
  };

  const days = getDaysArray();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getShiftsForDate = (dateStr: string) => {
    let dayShifts = shifts.filter(s => s.Date === dateStr);
    if (selectedStaffId !== 'all') {
      dayShifts = dayShifts.filter(s => s.UserID === selectedStaffId);
    }
    return dayShifts;
  };

  const checkRequirements = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    
    const dayRequirements = requirements.filter(req => req.DayOfWeek === dayOfWeek);
    if (dayRequirements.length === 0) return { ok: true, shortages: [], overages: [] };
    
    // その日の承認済み/調整済みのシフトを取得 (全体)
    const allDayShifts = shifts.filter(s => s.Date === dateStr && (s.Status === '承認済' || s.Status === '調整済'));
    const shortages: any[] = [];
    const overages: any[] = [];
    
    dayRequirements.forEach(req => {
      const reqStart = new Date(`1970-01-01T${req.StartTime}`).getTime();
      const reqEnd = new Date(`1970-01-01T${req.EndTime}`).getTime();
      
      const coveredShifts = allDayShifts.filter(shift => {
        const sStart = new Date(`1970-01-01T${shift.StartTime}`).getTime();
        const sEnd = new Date(`1970-01-01T${shift.EndTime}`).getTime();
        return (sStart < reqEnd && sEnd > reqStart);
      });
      
      if (coveredShifts.length < req.RequiredStaffCount) {
        shortages.push({
          ...req,
          currentCount: coveredShifts.length,
          shortageCount: req.RequiredStaffCount - coveredShifts.length
        });
      } else if (coveredShifts.length > req.RequiredStaffCount) {
        overages.push({
          ...req,
          currentCount: coveredShifts.length,
          overageCount: coveredShifts.length - req.RequiredStaffCount
        });
      }
    });
    
    return {
      ok: shortages.length === 0 && overages.length === 0,
      hasShortage: shortages.length > 0,
      hasOverage: overages.length > 0,
      shortages,
      overages
    };
  };

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

  // スタッフ別集計データの計算
  const getStaffStats = () => {
    if (selectedStaffId === 'all') return null;

    const staffShifts = shifts.filter(s => s.UserID === selectedStaffId);
    
    // 稼働日（承認済 + 調整済）
    const workingDays = staffShifts.filter(s => s.Status === '承認済' || s.Status === '調整済').length;
    
    // 調整日数
    const adjustedDays = staffShifts.filter(s => s.Status === '調整済').length;
    
    // 却下日数
    const rejectedDays = staffShifts.filter(s => s.Status === '却下').length;
    
    // 稼働時間
    let totalWorkingHours = 0;
    staffShifts.filter(s => s.Status === '承認済' || s.Status === '調整済').forEach(s => {
      const start = new Date(`1970-01-01T${s.StartTime}`);
      const end = new Date(`1970-01-01T${s.EndTime}`);
      const diffMs = end.getTime() - start.getTime();
      let hours = diffMs / (1000 * 60 * 60);
      if (hours < 0) hours += 24; // 日またぎ対応
      totalWorkingHours += hours;
    });

    return { workingDays, totalWorkingHours, adjustedDays, rejectedDays };
  };

  const stats = getStaffStats();

  const openAdjustMode = (shift: any) => {
    setAdjustingShiftId(shift.ShiftID);
    setAdjustStart(shift.StartTime.slice(0, 5));
    setAdjustEnd(shift.EndTime.slice(0, 5));
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`
        @keyframes innerGlowRed {
          0% { box-shadow: inset 0 0 0 rgba(255, 59, 48, 0); }
          50% { box-shadow: inset 0 0 12px 1px rgba(255, 59, 48, 0.7); }
          100% { box-shadow: inset 0 0 0 rgba(255, 59, 48, 0); }
        }

        @keyframes innerGlowBlue {
          0% { box-shadow: inset 0 0 0 rgba(10, 132, 255, 0); }
          50% { box-shadow: inset 0 0 12px 1px rgba(10, 132, 255, 0.7); }
          100% { box-shadow: inset 0 0 0 rgba(10, 132, 255, 0); }
        }

        .gradient-border-red {
          animation: innerGlowRed 2.5s infinite ease-in-out;
        }

        .gradient-border-blue {
          animation: innerGlowBlue 2.5s infinite ease-in-out;
        }
      `}</style>
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {isHeadquarters && (
          <select 
            value={selectedStoreId} 
            onChange={(e) => {
              setSelectedStoreId(e.target.value);
              setSelectedStaffId('all'); // 店舗が変わったらスタッフ選択もリセット
            }}
            style={{ padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '300px', backgroundColor: '#fff', cursor: 'pointer' }}
          >
            {stores.map(store => (
              <option key={store.StoreID} value={store.StoreID}>{store.StoreName}</option>
            ))}
          </select>
        )}
        <select 
          value={selectedStaffId} 
          onChange={(e) => setSelectedStaffId(e.target.value)}
          style={{ padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '300px', backgroundColor: '#fff', cursor: 'pointer' }}
        >
          <option value="all">全体 (すべてのスタッフ)</option>
          {storeUsers.map(user => (
            <option key={user.UserID} value={user.UserID}>{user.Name}</option>
          ))}
        </select>
      </div>

      {/* 個別スタッフ選択時の集計ダッシュボード */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.5rem', fontWeight: 'bold' }}>今月の稼働日数</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{stats.workingDays} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-sub)' }}>日</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.5rem', fontWeight: 'bold' }}>総稼働時間</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{stats.totalWorkingHours.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-sub)' }}>h</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.5rem', fontWeight: 'bold' }}>時間調整</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#B38F00' }}>{stats.adjustedDays} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-sub)' }}>回</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.5rem', fontWeight: 'bold' }}>却下</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#c5221f' }}>{stats.rejectedDays} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-sub)' }}>回</span></div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>◀</button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{year}年 {month + 1}月</h2>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>▶</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'var(--border-color)' }}>
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {day}
            </div>
          ))}
          
          {days.map((dateObj, index) => {
            const { day, month: cellMonth, year: cellYear, isCurrentMonth } = dateObj;
            const dateStr = `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const todayDate = new Date();
            const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayShifts = getShiftsForDate(dateStr);
            const pendingCount = dayShifts.filter(s => s.Status === '申請中').length;
            const approvedCount = dayShifts.filter(s => s.Status === '承認済' || s.Status === '調整済').length;
            const rejectedCount = dayShifts.filter(s => s.Status === '却下').length;
            const reqStatus = checkRequirements(dateStr);
            let animationClass = '';
            
            const now = new Date();
            const isViewingCurrentRealWorldMonth = year === now.getFullYear() && month === now.getMonth();

            if (selectedStaffId === 'all' && isCurrentMonth && isViewingCurrentRealWorldMonth) {
              if (reqStatus.hasShortage) {
                animationClass = 'gradient-border-red';
              } else if (reqStatus.hasOverage) {
                animationClass = 'gradient-border-blue';
              }
            }

            return (
              <div 
                key={index} 
                className={animationClass}
                onClick={() => setSelectedDate(dateStr)}
                style={{ 
                  backgroundColor: isCurrentMonth ? '#FFFFFF' : '#FAFAFA', 
                  minHeight: '100px', 
                  padding: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f4f8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isToday ? 'var(--text-main)' : 'transparent',
                    color: isToday ? '#fff' : (index % 7 === 0) ? '#c5221f' : (index % 7 === 6) ? '#1967d2' : '#333',
                    fontSize: isCurrentMonth ? '0.9rem' : '0.8rem', 
                    marginBottom: '0.5rem', 
                    fontWeight: isCurrentMonth ? 'bold' : 'normal' 
                  }}>
                    {!isCurrentMonth ? `${cellMonth}/${day}` : day}
                  </div>
                </div>
                
                {/* 申請中バッジ */}
                {pendingCount > 0 && (
                  <div style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '20px', backgroundColor: '#F5F5F5', color: '#888888', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    申請中 {pendingCount}件
                  </div>
                )}
                {/* 承認済バッジ */}
                {approvedCount > 0 && (
                  <div style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '20px', backgroundColor: '#FFF5CC', color: '#B38F00', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    確定 {approvedCount}件
                  </div>
                )}
                {/* 却下バッジ */}
                {rejectedCount > 0 && (
                  <div style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '20px', backgroundColor: '#fce8e6', color: '#c5221f', textAlign: 'center', fontWeight: 'bold' }}>
                    却下 {rejectedCount}件
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 凡例（アニメーションの意味） */}
      {selectedStaffId === 'all' && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', justifyContent: 'flex-end', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fff', boxShadow: 'inset 0 0 8px 1px rgba(255, 59, 48, 0.7)' }}></div>
            <span>人員不足</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fff', boxShadow: 'inset 0 0 8px 1px rgba(10, 132, 255, 0.7)' }}></div>
            <span>人員過多</span>
          </div>
        </div>
      )}

      {/* モーダル表示 */}
      {selectedDate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
              <button 
                onClick={() => { setSelectedDate(null); setAdjustingShiftId(null); }}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--text-sub)' }}
              >
                ×
              </button>
              
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 1rem 0', color: 'var(--text-main)' }}>
                {selectedDate.replace(/-/g, '/')} のシフト一覧
              </h2>
              
              {/* 人員不足・過多警告 */}
              {selectedStaffId === 'all' && (
                <>
                  {checkRequirements(selectedDate).hasShortage && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fce8e6', borderLeft: '4px solid #c5221f', borderRadius: '4px' }}>
                      <h3 style={{ fontSize: '1rem', color: '#c5221f', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚠️ 人員不足の枠があります
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#c5221f', fontSize: '0.9rem' }}>
                        {checkRequirements(selectedDate).shortages.map((shortage: any) => (
                          <li key={shortage.RequirementID} style={{ marginBottom: '4px' }}>
                            {shortage.TimeSlotName} ({shortage.StartTime.slice(0, 5)}-{shortage.EndTime.slice(0, 5)}) : あと <strong>{shortage.shortageCount}名</strong> 必要です
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {checkRequirements(selectedDate).hasOverage && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e8f0fe', borderLeft: '4px solid #1967d2', borderRadius: '4px' }}>
                      <h3 style={{ fontSize: '1rem', color: '#1967d2', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ℹ️ 人員過多の枠があります
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#1967d2', fontSize: '0.9rem' }}>
                        {checkRequirements(selectedDate).overages.map((overage: any) => (
                          <li key={overage.RequirementID} style={{ marginBottom: '4px' }}>
                            {overage.TimeSlotName} ({overage.StartTime.slice(0, 5)}-{overage.EndTime.slice(0, 5)}) : <strong>{overage.overageCount}名</strong> オーバーしています
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {getShiftsForDate(selectedDate).length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>この日のシフト申請はありません。</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {getShiftsForDate(selectedDate).map(shift => (
                    <div key={shift.ShiftID} style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.2rem', backgroundColor: shift.Status === '申請中' ? '#FFFFFF' : '#F9F9FB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', color: 'var(--text-color)' }}>{shift.UserName}</h3>
                          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-color)' }}>
                            {shift.StartTime.slice(0, 5)} - {shift.EndTime.slice(0, 5)}
                          </p>
                          {shift.Status === '調整済' && shift.OriginalStartTime && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                              ※提出時: {shift.OriginalStartTime.slice(0, 5)} - {shift.OriginalEndTime?.slice(0, 5)}
                            </p>
                          )}
                        </div>
                        <span style={{ 
                          fontSize: '0.8rem', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold',
                          backgroundColor: (shift.Status === '承認済' || shift.Status === '調整済') ? '#FFF5CC' : shift.Status === '申請中' ? '#F5F5F5' : '#fce8e6',
                          color: (shift.Status === '承認済' || shift.Status === '調整済') ? '#B38F00' : shift.Status === '申請中' ? '#888888' : '#c5221f',
                          border: `1px solid ${(shift.Status === '承認済' || shift.Status === '調整済') ? '#FFE066' : shift.Status === '申請中' ? '#E0E0E0' : '#f5c6cb'}`
                        }}>
                          {shift.Status}
                        </span>
                      </div>

                      {/* アクションボタン群 */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {adjustingShiftId === shift.ShiftID ? (
                          // 調整モード
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.8rem', backgroundColor: '#FFF5CC', borderRadius: '12px' }}>
                            <input type="time" value={adjustStart} onChange={e => setAdjustStart(e.target.value)} style={{ padding: '0.5rem', border: 'none', borderRadius: '8px' }} />
                            <span style={{ fontWeight: 'bold' }}>〜</span>
                            <input type="time" value={adjustEnd} onChange={e => setAdjustEnd(e.target.value)} style={{ padding: '0.5rem', border: 'none', borderRadius: '8px' }} />
                            <button disabled={actionLoading} onClick={() => handleStatusChange(shift.ShiftID, '調整済', adjustStart, adjustEnd)} style={{ padding: '0.5rem 1rem', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>決定</button>
                            <button onClick={() => setAdjustingShiftId(null)} style={{ padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>取消</button>
                          </div>
                        ) : (
                          // 通常のアクションボタン
                          <>
                            {shift.Status === '申請中' && (
                              <button disabled={actionLoading} onClick={() => handleStatusChange(shift.ShiftID, '承認済')} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'var(--primary-color)', color: '#333', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(255, 204, 0, 0.3)' }}>
                                承認する
                              </button>
                            )}
                            {shift.Status !== '却下' && (
                              <button disabled={actionLoading} onClick={() => handleStatusChange(shift.ShiftID, '却下')} style={{ flex: 1, padding: '0.8rem', backgroundColor: '#fff', color: '#333', border: '1px solid #EBEBEB', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                                却下する
                              </button>
                            )}
                            <button onClick={() => openAdjustMode(shift)} style={{ flex: 1, padding: '0.8rem', backgroundColor: '#F5F5F5', color: '#333', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
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
