'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'ダッシュボード', path: '/manager', icon: '📊' },
    { name: 'シフト管理', path: '/manager/shifts', icon: '✅' },
    { name: 'スタッフ管理', path: '/manager/staff', icon: '👥' },
    { name: 'TODO管理', path: '/manager/todo', icon: '📋' },
    { name: '店舗設定', path: '/manager/settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>シフト管理</h2>
        <span className="badge">店長用</span>
      </div>
      <nav className="sidebar-nav">
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
    </aside>
  );
}
