'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import { Calendar, LogOut } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="bottom-nav">
      <Link href="/staff" className={`nav-item ${pathname === '/staff' ? 'active' : ''}`}>
        <span className="nav-icon" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={20} />
        </span>
        <span className="nav-label">カレンダー</span>
      </Link>
      
      <button onClick={handleLogout} className="nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span className="nav-icon" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={20} />
        </span>
        <span className="nav-label">ログアウト</span>
      </button>
    </nav>
  );
}
