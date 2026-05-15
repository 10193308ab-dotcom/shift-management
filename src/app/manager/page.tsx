'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Todo = {
  TaskID: string;
  Content: string;
  Deadline: string | null;
  Status: string;
};

export default function ManagerDashboard() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [todoCount, setTodoCount] = useState<number | null>(null);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  
  // お知らせ用ステート
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementContent, setAnnouncementContent] = useState('');
  const [targetStore, setTargetStore] = useState<string>('all');
  const [submittingAnn, setSubmittingAnn] = useState(false);
  const [managerProfile, setManagerProfile] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: managerProfileData } = await supabase
        .from('Users')
        .select('UserID, StoreID, Role')
        .eq('UserID', authData.user.id)
        .single();

      if (managerProfileData) {
        setManagerProfile(managerProfileData);
        const isHQ = managerProfileData.Role === '本部' || managerProfileData.Role === '管理者';

        if (isHQ) {
          const { data: storesData } = await supabase.from('StoreSettings').select('StoreID, StoreName');
          if (storesData) setStores(storesData);
        }

        const { data: storeUsers } = await supabase
          .from('Users')
          .select('UserID')
          .eq('StoreID', managerProfileData.StoreID)
          .eq('Role', 'スタッフ');

        if (storeUsers && storeUsers.length > 0) {
          const userIds = storeUsers.map(u => u.UserID);
          const { count } = await supabase
            .from('Shifts')
            .select('*', { count: 'exact', head: true })
            .in('UserID', userIds)
            .eq('Status', '申請中');

          setPendingCount(count || 0);
        } else {
          setPendingCount(0);
        }

        // お知らせの取得
        let annQuery = supabase
          .from('Announcements')
          .select('*, Users!Announcements_CreatorID_fkey(Name), StoreSettings(StoreName)')
          .order('CreatedAt', { ascending: false });

        if (isHQ) {
          // 本部は、本部から各店舗（店長）向けに配信したお知らせのみ表示
          annQuery = annQuery.eq('TargetRole', '店長');
        } else {
          // 店長は「本部からの全店舗向け」「本部からの自店舗向け」「自分が投稿したスタッフ向け」を見る
          annQuery = annQuery.or(`TargetStoreID.is.null,TargetStoreID.eq.${managerProfileData.StoreID},CreatorID.eq.${authData.user.id}`);
        }

        const { data: annData, error: annError } = await annQuery;
        if (annError) console.error('Announcement fetch error:', annError);
        
        // 非表示にしたお知らせを除外
        const { data: hiddenData } = await supabase
          .from('HiddenAnnouncements')
          .select('AnnouncementID')
          .eq('UserID', authData.user.id);

        const hiddenIds = hiddenData ? hiddenData.map(h => h.AnnouncementID) : [];
        if (annData) {
          setAnnouncements(annData.filter(a => !hiddenIds.includes(a.AnnouncementID)));
        }
      }

      // TODOの未完了件数を取得
      const { data: pendingTodos } = await supabase
        .from('Todos')
        .select('*')
        .eq('OwnerID', authData.user.id)
        .neq('Status', '完了')
        .order('Deadline', { ascending: true, nullsFirst: false });
      
      if (pendingTodos) {
        setTodoCount(pendingTodos.length);
        
        // 本日が期限、または期限切れのTODOを抽出
        const now = new Date();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
        
        const urgent = pendingTodos.filter(t => {
          if (!t.Deadline) return false;
          const d = new Date(t.Deadline).getTime();
          return d <= endOfToday;
        });
        setTodayTodos(urgent as Todo[]);
      } else {
        setTodoCount(0);
      }
    };
    fetchData();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementContent.trim() || !managerProfile) return;
    setSubmittingAnn(true);

    const isHQ = managerProfile.Role === '本部' || managerProfile.Role === '管理者';
    const finalTargetStore = isHQ ? (targetStore === 'all' ? null : targetStore) : managerProfile.StoreID;
    const targetRole = isHQ ? '店長' : 'スタッフ';

    const { error } = await supabase
      .from('Announcements')
      .insert([{
        CreatorID: managerProfile.UserID,
        TargetStoreID: finalTargetStore,
        TargetRole: targetRole,
        Content: announcementContent
      }]);

    if (error) {
      alert('お知らせの送信に失敗しました: ' + error.message);
    } else {
      setAnnouncementContent('');
      alert('お知らせを送信しました。');
      // リロードするため簡単な再描画
      window.location.reload();
    }
    setSubmittingAnn(false);
  };

  const handleHideAnnouncement = async (announcementId: string) => {
    if (!managerProfile) return;
    
    // UI上で即座に消す
    setAnnouncements(prev => prev.filter(a => a.AnnouncementID !== announcementId));

    // DBに記録
    await supabase
      .from('HiddenAnnouncements')
      .insert([{
        UserID: managerProfile.UserID,
        AnnouncementID: announcementId
      }]);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderTop: '4px solid var(--primary-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>未承認のシフト申請</h2>
          </div>
          
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: pendingCount && pendingCount > 0 ? '#c5221f' : 'var(--text-main)', marginBottom: '1rem' }}>
            {pendingCount === null ? '-' : pendingCount} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-sub)' }}>件</span>
          </div>

          <Link href="/manager/shifts" style={{ marginTop: 'auto', display: 'inline-block', padding: '0.5rem 1.5rem', backgroundColor: 'var(--text-main)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'} onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
            シフト管理を開く
          </Link>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderTop: '4px solid var(--text-main)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>未完了のTODO</h2>
          </div>
          
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: todoCount && todoCount > 0 ? 'var(--text-main)' : 'var(--text-sub)', marginBottom: '1rem' }}>
            {todoCount === null ? '-' : todoCount} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-sub)' }}>件</span>
          </div>

          {todayTodos.length > 0 && (
            <div style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#c5221f' }}>本日が期限のタスク</div>
              {todayTodos.slice(0, 3).map(todo => (
                <div key={todo.TaskID} style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-main)', padding: '0.5rem 0.8rem', backgroundColor: '#fce8e6', borderRadius: '4px' }}>
                  <span style={{ marginRight: '0.5rem', color: '#c5221f' }}>•</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{todo.Content}</span>
                </div>
              ))}
              {todayTodos.length > 3 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', textAlign: 'center' }}>
                  他 {todayTodos.length - 3} 件
                </div>
              )}
            </div>
          )}

          <Link href="/manager/todo"  style={{ marginTop: 'auto', display: 'inline-block', padding: '0.5rem 1.5rem', backgroundColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}>
            TODO管理を開く
          </Link>
        </div>
      </div>

      {/* お知らせセクション */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* お知らせ投稿フォーム */}
        <div className="card" style={{ borderTop: '4px solid var(--text-main)' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📢</span> お知らせを配信する
          </h2>
          <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {managerProfile && (managerProfile.Role === '本部' || managerProfile.Role === '管理者') ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>配信先</label>
                <select value={targetStore} onChange={(e) => setTargetStore(e.target.value)}>
                  <option value="all">全店舗の店長</option>
                  {stores.map(store => (
                    <option key={store.StoreID} value={store.StoreID}>{store.StoreName}の店長</option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>自店舗のスタッフへお知らせを配信します。</p>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>お知らせ内容</label>
              <textarea 
                rows={4}
                required
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="配信するメッセージを入力..."
                style={{ resize: 'vertical' }}
              />
            </div>
            <button type="submit" disabled={submittingAnn || !announcementContent.trim()} className="btn-primary" style={{ height: '44px' }}>
              {submittingAnn ? '送信中...' : '配信する'}
            </button>
          </form>
        </div>

        {/* 配信済み・受信お知らせ一覧 */}
        <div className="card" style={{ borderTop: '4px solid var(--text-main)' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', color: 'var(--text-main)' }}>
            受信・配信済みのお知らせ
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {announcements.length === 0 ? (
              <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>お知らせはありません。</p>
            ) : (
              announcements.map((ann) => {
                const isMine = managerProfile && ann.CreatorID === managerProfile.UserID;
                const targetText = ann.TargetStoreID ? (ann.StoreSettings?.StoreName || '特定店舗') : '全店舗';
                
                let senderText = '';
                if (isMine) {
                  senderText = `自分が配信 (${targetText}宛)`;
                } else if (ann.TargetRole === '店長') {
                  senderText = `本部からのお知らせ`;
                } else {
                  senderText = `${ann.Users?.Name || '店長'}からのお知らせ`;
                }

                return (
                  <div key={ann.AnnouncementID} style={{ padding: '12px', backgroundColor: isMine ? '#f8f9fa' : '#fff9e6', border: '1px solid var(--border-color)', borderRadius: '8px', position: 'relative' }}>
                    <button 
                      onClick={() => handleHideAnnouncement(ann.AnnouncementID)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-sub)' }}
                      title="非表示にする"
                    >
                      ×
                    </button>
                    
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '4px', display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: isMine ? 'var(--text-sub)' : 'var(--primary-hover)' }}>
                        {senderText}
                      </span>
                      <span>{new Date(ann.CreatedAt).toLocaleString('ja-JP')}</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {ann.Content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
