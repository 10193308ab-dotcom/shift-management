'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ShiftApply() {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      alert('ログインが必要です');
      return;
    }

    const { error } = await supabase
      .from('Shifts')
      .insert([{
        UserID: authData.user.id,
        Date: date,
        StartTime: startTime,
        EndTime: endTime,
        Status: '申請中'
      }]);

    if (error) {
      alert('申請エラー: ' + error.message);
    } else {
      alert('シフトを申請しました！');
      router.push('/staff');
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <Link href="/staff" style={{ fontSize: '1.5rem', textDecoration: 'none', color: 'var(--text-color)' }}>←</Link>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}>シフト申請</h1>
      </div>
      
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div className="form-group">
          <label>日付</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>開始時間</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>終了時間</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? '申請中...' : 'シフトを申請する'}
        </button>
      </form>
    </div>
  );
}
