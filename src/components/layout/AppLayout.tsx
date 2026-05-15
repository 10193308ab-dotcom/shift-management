'use client';

import React from 'react';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // ログイン画面 (ルート) および登録画面ではナビゲーションを隠す
  const isLoginPage = pathname === '/' || pathname === '/register' || pathname === '/staff-register';
  
  const isManager = pathname.startsWith('/manager');
  const isStaff = pathname.startsWith('/staff');

  return (
    <div className="app-layout">
      {!isLoginPage && isManager && <Sidebar />}
      <main className="main-content" style={isLoginPage ? { padding: 0 } : {}}>
        {children}
      </main>
      {!isLoginPage && isStaff && <BottomNav />}
    </div>
  );
}
