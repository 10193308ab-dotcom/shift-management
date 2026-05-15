'use client';

export default function StaffHome() {
  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--primary-color)' }}>
        カレンダー
      </h1>
      <p>ここにあなたのシフトと、他スタッフの確定シフトが表示されます。</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8e8e93' }}>カレンダーUIをここに実装します</p>
      </div>
    </div>
  );
}
