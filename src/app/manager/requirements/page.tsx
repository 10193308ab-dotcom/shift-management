'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ShiftRequirementsPage() {
  const [activeDay, setActiveDay] = useState(1); // 1 = 月曜日
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  // フォームステート
  const [newSlotName, setNewSlotName] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newCount, setNewCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days = [
    { id: 0, label: '日' },
    { id: 1, label: '月' },
    { id: 2, label: '火' },
    { id: 3, label: '水' },
    { id: 4, label: '木' },
    { id: 5, label: '金' },
    { id: 6, label: '土' }
  ];

  useEffect(() => {
    fetchRequirements();
  }, [activeDay]);

  const fetchRequirements = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    // 店舗IDの取得
    let currentStoreId = storeId;
    if (!currentStoreId) {
      const { data: userData } = await supabase
        .from('Users')
        .select('StoreID')
        .eq('UserID', authData.user.id)
        .single();
      
      if (userData) {
        currentStoreId = userData.StoreID;
        setStoreId(currentStoreId);
      }
    }

    if (currentStoreId) {
      const { data } = await supabase
        .from('ShiftRequirements')
        .select('*')
        .eq('StoreID', currentStoreId)
        .eq('DayOfWeek', activeDay)
        .order('StartTime', { ascending: true });
        
      if (data) {
        setRequirements(data);
      }
    }
    setLoading(false);
  };

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !newSlotName || !newStartTime || !newEndTime) return;
    
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('ShiftRequirements')
      .insert([
        {
          StoreID: storeId,
          DayOfWeek: activeDay,
          TimeSlotName: newSlotName,
          StartTime: `${newStartTime}:00`,
          EndTime: `${newEndTime}:00`,
          RequiredStaffCount: newCount
        }
      ]);

    if (error) {
      alert('追加に失敗しました: ' + error.message);
    } else {
      setNewSlotName('');
      setNewCount(1);
      await fetchRequirements();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この枠を削除しますか？')) return;
    
    const { error } = await supabase
      .from('ShiftRequirements')
      .delete()
      .eq('RequirementID', id);
      
    if (error) {
      alert('削除に失敗しました: ' + error.message);
    } else {
      await fetchRequirements();
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        シフト枠設定 (必要人数)
      </h1>
      <p style={{ color: 'var(--text-sub)', marginBottom: '2rem' }}>
        曜日ごとの時間帯と、必要なスタッフの人数を設定します。ここで設定した人数に満たない日は、カレンダーに警告が表示されます。
      </p>

      {/* 曜日タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {days.map(day => (
          <button
            key={day.id}
            onClick={() => setActiveDay(day.id)}
            style={{
              padding: '0.8rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeDay === day.id ? '3px solid var(--primary-color)' : '3px solid transparent',
              color: activeDay === day.id ? 'var(--text-main)' : 'var(--text-sub)',
              fontWeight: activeDay === day.id ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem',
              whiteSpace: 'nowrap'
            }}
          >
            {day.label}曜日
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {days.find(d => d.id === activeDay)?.label}曜日の枠を追加
        </h2>
        <form onSubmit={handleAddRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label>枠名 (例: 早番、ランチ等)</label>
              <input type="text" value={newSlotName} onChange={e => setNewSlotName(e.target.value)} required placeholder="早番" />
            </div>
            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
              <label>開始時間</label>
              <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
              <label>終了時間</label>
              <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
              <label>必要人数</label>
              <input type="number" min="1" value={newCount} onChange={e => setNewCount(parseInt(e.target.value))} required />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
            枠を追加する
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          登録済みのシフト枠
        </h2>
        {loading ? (
          <p style={{ color: 'var(--text-sub)' }}>読み込み中...</p>
        ) : requirements.length === 0 ? (
          <p style={{ color: 'var(--text-sub)' }}>この曜日に登録されているシフト枠はありません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requirements.map(req => (
              <div key={req.RequirementID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>{req.TimeSlotName}</div>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>
                    {req.StartTime.slice(0, 5)} - {req.EndTime.slice(0, 5)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>必要人数</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{req.RequiredStaffCount}名</div>
                  </div>
                  <button onClick={() => handleDelete(req.RequirementID)} style={{ background: '#fce8e6', color: '#c5221f', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
