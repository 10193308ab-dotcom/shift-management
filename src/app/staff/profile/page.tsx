'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function StaffProfile() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div style={{ padding: '1.5rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '2rem' }}>設定</h1>
      
      <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>アカウント管理</h2>
        
        <button 
          onClick={handleLogout} 
          style={{ width: '100%', padding: '0.85rem', background: '#fff', border: '1px solid #ff3b30', color: '#ff3b30', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🚪 ログアウト
        </button>
      </div>
    </div>
  );
}
