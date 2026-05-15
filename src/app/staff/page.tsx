'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function StaffCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
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

        const { data: todosData } = await supabase
          .from('Todos')
          .select('*')
          .eq('OwnerID', userProfile.UserID);
          
        if (todosData) {
          setTodos(todosData);
        }

        // お知らせの取得 (自店舗宛)
        const { data: annData } = await supabase
          .from('Announcements')
          .select('*, Users!Announcements_CreatorID_fkey(Name)')
          .eq('TargetStoreID', userProfile.StoreID)
          .order('CreatedAt', { ascending: false });

        // 非表示にしたお知らせを除外
        const { data: hiddenData } = await supabase
          .from('HiddenAnnouncements')
          .select('AnnouncementID')
          .eq('UserID', authData.user.id);

        const hiddenIds = hiddenData ? hiddenData.map(h => h.AnnouncementID) : [];
        if (annData) {
          setAnnouncements(annData.filter(a => !hiddenIds.includes(a.AnnouncementID)));
        }
      }
    }
    setLoading(false);
  };

  const handleHideAnnouncement = async (announcementId: string) => {
    if (!currentUser) return;
    
    // UI上で即座に消す
    setAnnouncements(prev => prev.filter(a => a.AnnouncementID !== announcementId));

    // DBに記録
    await supabase
      .from('HiddenAnnouncements')
      .insert([{
        UserID: currentUser.UserID,
        AnnouncementID: announcementId
      }]);
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
    // 自分のシフトだけをフィルタリング
    return shifts.filter(s => s.Date === dateStr && s.UserID === currentUser?.UserID);
  };

  // モーダル表示用にデフォルトはnull
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [applyStartTime, setApplyStartTime] = useState('09:00');
  const [applyEndTime, setApplyEndTime] = useState('17:00');
  const [applyLoading, setApplyLoading] = useState(false);

  const selectedShifts = selectedDate ? getShiftsForDate(selectedDate) : [];

  const [newTodo, setNewTodo] = useState('');
  const [todoLoading, setTodoLoading] = useState(false);

  const selectedTodos = selectedDate ? todos.filter(t => {
    if (!t.Deadline) return false;
    return t.Deadline.split('T')[0] === selectedDate;
  }) : [];

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !currentUser || !selectedDate) return;
    setTodoLoading(true);
    
    const { data, error } = await supabase
      .from('Todos')
      .insert([{
        OwnerID: currentUser.UserID,
        CreatorID: currentUser.UserID,
        Content: newTodo.trim(),
        Deadline: `${selectedDate}T23:59:59+09:00`,
        Status: '未着手'
      }])
      .select();

    if (data && !error) {
      setTodos([...todos, data[0]]);
      setNewTodo('');
    } else {
      alert('ToDo追加エラー: ' + error?.message);
    }
    setTodoLoading(false);
  };

  const toggleTodo = async (todo: any) => {
    const newStatus = todo.Status === '完了' ? '未着手' : '完了';
    setTodos(todos.map(t => t.TaskID === todo.TaskID ? { ...t, Status: newStatus } : t));
    await supabase.from('Todos').update({ Status: newStatus }).eq('TaskID', todo.TaskID);
  };

  const deleteTodo = async (taskId: string) => {
    setTodos(todos.filter(t => t.TaskID !== taskId));
    await supabase.from('Todos').delete().eq('TaskID', taskId);
  };

  const handleApplyShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !currentUser) return;
    
    setApplyLoading(true);
    const { error } = await supabase
      .from('Shifts')
      .insert([{
        UserID: currentUser.UserID,
        Date: selectedDate,
        StartTime: applyStartTime,
        EndTime: applyEndTime,
        Status: '申請中'
      }]);

    if (error) {
      alert('申請エラー: ' + error.message);
    } else {
      setSelectedDate(null); // 申請後にモーダルを閉じる
      await fetchData(); // リストを再取得して表示を更新
    }
    setApplyLoading(false);
  };

  return (
    <div style={{ padding: '0.5rem 0', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      {/* お知らせ表示（あれば表示） */}
      {announcements.length > 0 && (
        <div style={{ padding: '0 0.5rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {announcements.map(ann => (
            <div key={ann.AnnouncementID} style={{ backgroundColor: '#fff9e6', border: '1px solid var(--primary-color)', borderRadius: '8px', padding: '12px', position: 'relative' }}>
              <button 
                onClick={() => handleHideAnnouncement(ann.AnnouncementID)}
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-sub)' }}
              >
                ×
              </button>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-hover)', marginBottom: '4px' }}>
                📢 店長からのお知らせ
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {ann.Content}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '1rem', marginBottom: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.5rem' }}>◀</button>
          <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {year}年 {month + 1}月
            {(year !== new Date().getFullYear() || month !== new Date().getMonth()) && (
              <button 
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer', color: 'var(--text-sub)' }}
              >
                今日
              </button>
            )}
          </h2>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.5rem' }}>▶</button>
        </div>

        {/* カレンダーグリッド (枠線なし、縦長に拡張) */}
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1, gridAutoRows: 'minmax(0, 1fr)' }}>
          {/* 曜日ヘッダー */}
          {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
            <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: i === 0 ? 'var(--error-color)' : i === 6 ? '#1967d2' : 'var(--text-sub)', paddingBottom: '0.5rem', alignSelf: 'start' }}>
              {day}
            </div>
          ))}
          
          {/* 日付セル */}
          {days.map((dateObj, index) => {
            const { day, month: cellMonth, year: cellYear, isCurrentMonth } = dateObj;
            const dateStr = `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayShifts = getShiftsForDate(dateStr);
            const isSelected = selectedDate === dateStr;
            const todayDate = new Date();
            const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;

            // ステータスフラグ
            const hasConfirmed = dayShifts.some(s => s.Status === '承認済' || s.Status === '調整済');
            const hasPending = dayShifts.some(s => s.Status === '申請中');
            const hasRejected = dayShifts.some(s => s.Status === '却下');
            
            const dayTodos = todos.filter(t => {
              if (!t.Deadline) return false;
              return t.Deadline.split('T')[0] === dateStr && t.Status !== '完了';
            });
            const hasTodo = dayTodos.length > 0;

            return (
              <div 
                key={index} 
                onClick={() => setSelectedDate(dateStr)}
                style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingTop: '8px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? 'rgba(255, 198, 0, 0.1)' : (isCurrentMonth ? 'transparent' : '#FAFAFA')
                }}
              >
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isToday ? '#333333' : 'transparent',
                    color: isToday ? '#FFFFFF' : isCurrentMonth ? ((index % 7 === 0) ? 'var(--error-color)' : (index % 7 === 6) ? '#1967d2' : 'var(--text-main)') : 'var(--text-sub)',
                    fontSize: isCurrentMonth ? '1rem' : '0.8rem',
                    fontWeight: isCurrentMonth ? 'bold' : 'normal',
                    marginBottom: '4px'
                  }}>
                    {!isCurrentMonth ? `${cellMonth}/${day}` : day}
                  </div>
                  {/* ステータスバッジとToDo Indicator */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                    {hasConfirmed && (
                      <div style={{ fontSize: '9px', color: '#B38F00', fontWeight: 'bold', backgroundColor: '#FFF9E6', padding: '0 4px', borderRadius: '4px' }}>
                        確定
                      </div>
                    )}
                    {hasPending && !hasConfirmed && (
                      <div style={{ fontSize: '9px', color: 'var(--text-sub)', fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: '0 4px', borderRadius: '4px' }}>
                        申請中
                      </div>
                    )}
                    {hasRejected && (
                      <div style={{ fontSize: '9px', color: 'var(--error-color)', fontWeight: 'bold', backgroundColor: '#fce8e6', padding: '0 4px', borderRadius: '4px' }}>
                        休
                      </div>
                    )}
                    {hasTodo && (
                      <div style={{ fontSize: '9px', color: 'var(--text-main)', fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: '0 4px', borderRadius: '4px' }}>
                        ToDo
                      </div>
                    )}
                  </div>
                </>
              </div>
            );
          })}
        </div>
      </div>

      {/* モーダル（選択した日の予定・申請フォーム） */}
      {selectedDate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedDate.split('-')[1]}月{selectedDate.split('-')[2]}日 の予定
              </h3>
              <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {selectedShifts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedShifts.map(shift => {
                    const isAdjusted = shift.Status === '調整済';
                    const isConfirmed = shift.Status === '承認済' || shift.Status === '調整済';
                    const isRejected = shift.Status === '却下';
                    
                    const statusMessage = isRejected ? 'この日のシフト申請は却下されました。'
                      : isAdjusted ? 'この日のシフトは以下の時間に調整されています。' 
                      : isConfirmed ? 'この日は以下の時間でシフトが確定しています。' 
                      : 'この日は以下の時間でシフトを申請中です。';
                    
                    return (
                      <div key={shift.ShiftID} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #eee' }}>
                        <p style={{ color: isConfirmed ? 'var(--text-main)' : isRejected ? 'var(--error-color)' : 'var(--text-sub)', fontWeight: (isConfirmed || isRejected) ? 'bold' : 'normal', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                          {statusMessage}
                        </p>
                        
                        {(isConfirmed || isRejected) ? (
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isRejected ? 'var(--text-sub)' : '#333', textDecoration: isRejected ? 'line-through' : 'none', textAlign: 'center', padding: '1rem 0', backgroundColor: isRejected ? '#F5F5F5' : 'var(--primary-color)', borderRadius: '8px' }}>
                            {shift.StartTime.slice(0, 5)} - {shift.EndTime.slice(0, 5)}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                              <label style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--text-sub)' }}>開始時間</label>
                              <input type="time" value={shift.StartTime.slice(0, 5)} readOnly style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', pointerEvents: 'none' }} />
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                              <label style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--text-sub)' }}>終了時間</label>
                              <input type="time" value={shift.EndTime.slice(0, 5)} readOnly style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', pointerEvents: 'none' }} />
                            </div>
                          </div>
                        )}
                        
                        {isAdjusted && (
                          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-sub)', textAlign: 'center' }}>
                            ※提出時: {shift.OriginalStartTime?.slice(0, 5)} - {shift.OriginalEndTime?.slice(0, 5)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // シフトがない場合、申請フォームを表示
                <div>
                  <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginBottom: '1rem' }}>この日の予定はありません。シフトを申請しますか？</p>
                  <form onSubmit={handleApplyShift} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '4px' }}>開始時間</label>
                        <input type="time" value={applyStartTime} onChange={e => setApplyStartTime(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', marginBottom: '4px' }}>終了時間</label>
                        <input type="time" value={applyEndTime} onChange={e => setApplyEndTime(e.target.value)} required />
                      </div>
                    </div>
                    <button type="submit" disabled={applyLoading} className="btn-primary" style={{ height: '48px', fontSize: '14px' }}>
                      {applyLoading ? '申請中...' : 'この時間で申請する'}
                    </button>
                  </form>
                </div>
              )}
              
              {/* ToDoセクション */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px dashed #eee' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>この日のToDo</h4>
                
                <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    value={newTodo} 
                    onChange={(e) => setNewTodo(e.target.value)} 
                    placeholder="新しいToDo..." 
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '14px' }}
                  />
                  <button type="submit" disabled={!newTodo.trim() || todoLoading} style={{ padding: '8px 12px', backgroundColor: 'var(--text-main)', color: '#fff', border: 'none', borderRadius: '4px', cursor: newTodo.trim() ? 'pointer' : 'not-allowed' }}>
                    追加
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedTodos.map(todo => (
                    <div key={todo.TaskID} style={{ display: 'flex', alignItems: 'center', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', opacity: todo.Status === '完了' ? 0.6 : 1 }}>
                      <input 
                        type="checkbox" 
                        checked={todo.Status === '完了'} 
                        onChange={() => toggleTodo(todo)}
                        style={{ marginRight: '8px', accentColor: 'var(--text-main)', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-main)', textDecoration: todo.Status === '完了' ? 'line-through' : 'none' }}>
                        {todo.Content}
                      </span>
                      <button onClick={() => deleteTodo(todo.TaskID)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
                    </div>
                  ))}
                  {selectedTodos.length === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--text-sub)', textAlign: 'center', margin: '8px 0' }}>ToDoはありません</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
