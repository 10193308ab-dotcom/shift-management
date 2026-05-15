'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function StaffProfile() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div style={{ padding: '1.5rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '2rem' }}>設定</h1>
      
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>アカウント管理</h2>
        
        <button 
          onClick={handleLogout} 
          style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '0.85rem', background: '#fff', border: '1px solid #ff3b30', color: '#ff3b30', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <LogOut size={18} /> ログアウト
        </button>
      </div>
    </div>
  );
}
