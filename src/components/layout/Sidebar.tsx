'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'ダッシュボード', path: '/manager', icon: '📊' },
    { name: 'シフト管理', path: '/manager/shifts', icon: '✅' },
    { name: 'スタッフ管理', path: '/manager/staff', icon: '👥' },
    { name: 'TODO管理', path: '/manager/todo', icon: '📋' },
    { name: '店舗設定', path: '/manager/settings', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="sidebar-header">
        <h2>シフト管理</h2>
        <span className="badge">店舗用</span>
      </div>
      <nav className="sidebar-nav" style={{ flexGrow: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/manager' && pathname.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', background: 'none', border: '1px solid #ff3b30', color: '#ff3b30', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          🚪 ログアウト
        </button>
      </div>
    </aside>
  );
}
