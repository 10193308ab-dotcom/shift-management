'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

import { LayoutDashboard, CalendarCheck, Users, ClipboardList, Settings, LogOut, Clock, X } from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose = () => {} }: { isOpen?: boolean, onClose?: () => void }) {
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
    { name: 'ダッシュボード', path: '/manager', icon: <LayoutDashboard size={20} /> },
    { name: 'シフト管理', path: '/manager/shifts', icon: <CalendarCheck size={20} /> },
    { name: 'シフト枠設定', path: '/manager/requirements', icon: <Clock size={20} /> },
    { name: 'スタッフ管理', path: '/manager/staff', icon: <Users size={20} /> },
    { name: 'TODO管理', path: '/manager/todo', icon: <ClipboardList size={20} /> },
  ];

  if (isHeadquarters) {
    navItems.push({ name: '店舗設定', path: '/manager/settings', icon: <Settings size={20} /> });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`} style={{ flexDirection: 'column', height: '100vh' }}>
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <h2>店舗管理</h2>
        {/* Mobile close button */}
        <button 
          onClick={onClose} 
          className="mobile-close-btn"
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', display: 'none' }}
        >
          <X size={24} />
        </button>
        <span className="badge" style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '20px', backgroundColor: 'var(--primary-color)', color: '#333333', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
          {storeName}
        </span>
      </div>
      <nav className="sidebar-nav" style={{ flexGrow: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/manager' && pathname.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '0.8rem', background: 'none', border: '1px solid #ff3b30', color: '#ff3b30', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff0f0'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <LogOut size={18} /> ログアウト
        </button>
      </div>
    </aside>
  );
}
