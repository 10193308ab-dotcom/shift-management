'use client';

import React from 'react';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // ログイン画面 (ルート) ではナビゲーションを隠す
  const isLoginPage = pathname === '/';

  return (
    <div className="app-layout">
      {!isLoginPage && <Sidebar />}
      <main className="main-content" style={isLoginPage ? { padding: 0 } : {}}>
        {children}
      </main>
      {!isLoginPage && <BottomNav />}
    </div>
  );
}
