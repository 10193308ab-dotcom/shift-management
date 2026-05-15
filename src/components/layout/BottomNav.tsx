'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'カレンダー', path: '/staff', icon: '📅' },
    { name: 'TODO', path: '/staff/todo', icon: '✅' },
    { name: '設定', path: '/staff/profile', icon: '👤' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.path || (item.path !== '/staff' && pathname.startsWith(item.path));
        return (
          <Link key={item.path} href={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
