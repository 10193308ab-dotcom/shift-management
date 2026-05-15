'use client';

export default function ManagerDashboard() {
  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--primary-color)' }}>
        店長ダッシュボード
      </h1>
      <p>ここに「申請中のシフト一覧」や「TODOの進捗」などを表示していきます。</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <h2>本日のアクション</h2>
        <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
          <li>未承認のシフト申請が 0 件あります</li>
          <li>完了していないTODOが 0 件あります</li>
        </ul>
      </div>
    </div>
  );
}
