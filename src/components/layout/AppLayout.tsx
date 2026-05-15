'use client';

import React, { useState } from 'react';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // ログイン画面 (ルート) および登録画面ではナビゲーションを隠す
  const isLoginPage = pathname === '/' || pathname === '/register' || pathname === '/staff-register';
  
  const isManager = pathname.startsWith('/manager');
  const isStaff = pathname.startsWith('/staff');

  return (
    <div className="app-layout">
      {!isLoginPage && isManager && (
        <>
          <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          {/* Mobile Overlay */}
          {mobileMenuOpen && (
            <div 
              className="mobile-overlay open" 
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </>
      )}
      
      <main className="main-content" style={isLoginPage ? { padding: 0 } : {}}>
        {!isLoginPage && isManager && (
          <div className="manager-mobile-header">
            <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
              <Menu size={24} />
            </button>
            <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>店舗管理</h1>
            <div style={{ width: '24px' }}></div> {/* Spacer for centering */}
          </div>
        )}
        {children}
      </main>
      {!isLoginPage && isStaff && <BottomNav />}
    </div>
  );
}
