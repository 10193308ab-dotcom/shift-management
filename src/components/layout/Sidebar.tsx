'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [storeName, setStoreName] = useState('店舗用');
  const [isHeadquarters, setIsHeadquarters] = useState(false);

  useEffect(() => {
    const fetchStoreName = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: userData } = await supabase
        .from('Users')
        .select('*, StoreSettings(StoreName)')
        .eq('UserID', authData.user.id)
        .single();
        
      if (userData?.StoreSettings?.StoreName) {
        setStoreName(userData.StoreSettings.StoreName);
      }
      
      if (userData?.Role === '本部' || userData?.Role === '管理者') {
        setIsHeadquarters(true);
      }
    };
    fetchStoreName();
  }, []);

  const navItems = [
    { name: 'ダッシュボード', path: '/manager', icon: '📊' },
    { name: 'シフト管理', path: '/manager/shifts', icon: '✅' },
    { name: 'スタッフ管理', path: '/manager/staff', icon: '👥' },
    { name: 'TODO管理', path: '/manager/todo', icon: '📋' },
  ];

  if (isHeadquarters) {
    navItems.push({ name: '店舗設定', path: '/manager/settings', icon: '⚙️' });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="sidebar-header">
        <h2>シフト管理</h2>
        <span className="badge" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: 'var(--primary-color)', color: '#fff', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {storeName}
        </span>
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
