'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Todo = {
  TaskID: string;
  OwnerID: string;
  Content: string;
  Deadline?: string | null;
  Status: '未着手' | '進行中' | '完了';
  CreatedAt: string;
};

export default function StaffTodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoContent, setNewTodoContent] = useState('');
  const [newTodoDeadline, setNewTodoDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchTodos = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    
    setUserId(authData.user.id);

    const { data, error } = await supabase
      .from('Todos')
      .select('*')
      .eq('OwnerID', authData.user.id)
      .order('CreatedAt', { ascending: false });

    if (data && !error) {
      setTodos(data as Todo[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoContent.trim() || !userId) return;

    const { data, error } = await supabase
      .from('Todos')
      .insert([
        {
          OwnerID: userId,
          CreatorID: userId,
          Content: newTodoContent.trim(),
          Deadline: newTodoDeadline ? `${newTodoDeadline}T23:59:59+09:00` : null,
          Status: '未着手'
        }
      ])
      .select();

    if (data && !error) {
      setTodos([data[0] as Todo, ...todos]);
      setNewTodoContent('');
      setNewTodoDeadline('');
    } else {
      alert('TODOの追加に失敗しました: ' + error?.message);
    }
  };

  const toggleTodoStatus = async (task: Todo) => {
    const newStatus = task.Status === '完了' ? '未着手' : '完了';
    
    // Optimistic update
    setTodos(todos.map(t => t.TaskID === task.TaskID ? { ...t, Status: newStatus } : t));

    const { error } = await supabase
      .from('Todos')
      .update({ Status: newStatus })
      .eq('TaskID', task.TaskID);

    if (error) {
      alert('ステータス更新に失敗しました: ' + error.message);
      // Revert on error
      fetchTodos();
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('このTODOを削除してもよろしいですか？')) return;

    // Optimistic update
    setTodos(todos.filter(t => t.TaskID !== taskId));

    const { error } = await supabase
      .from('Todos')
      .delete()
      .eq('TaskID', taskId);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      fetchTodos();
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-sub)' }}>読み込み中...</div>;
  }

  const incompleteTodos = todos.filter(t => t.Status !== '完了');
  const completeTodos = todos.filter(t => t.Status === '完了');

  const formatDeadline = (isoString?: string | null) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    // 期限の日の23:59:59と現在時刻を比較（日付が変わったら赤くする）
    const isPast = d.getTime() < new Date().getTime();
    
    return (
      <span style={{ 
        fontSize: '0.8rem', 
        marginLeft: '0.5rem', 
        color: isPast ? '#c5221f' : 'var(--text-sub)', 
        fontWeight: isPast ? 'bold' : 'normal',
        backgroundColor: isPast ? '#fce8e6' : '#f0f0f0',
        padding: '2px 6px',
        borderRadius: '12px',
        whiteSpace: 'nowrap'
      }}>
        期限: {month}/{day}
      </span>
    );
  };

  return (
    <div style={{ padding: '1.5rem', paddingBottom: '100px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        TODO管理
      </h1>

      <form onSubmit={handleAddTodo} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem', padding: '1rem' }}>
        <input
          type="text"
          value={newTodoContent}
          onChange={(e) => setNewTodoContent(e.target.value)}
          placeholder="新しいタスクを追加..."
          style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="date"
            value={newTodoDeadline}
            onChange={(e) => setNewTodoDeadline(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-main)' }}
          />
          <button 
            type="submit" 
            disabled={!newTodoContent.trim()}
            style={{ 
              padding: '0.8rem 1.5rem', 
              backgroundColor: newTodoContent.trim() ? 'var(--text-main)' : '#cccccc', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: newTodoContent.trim() ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            追加
          </button>
        </div>
      </form>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          未完了 ({incompleteTodos.length})
        </h2>
        
        {incompleteTodos.length === 0 ? (
          <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '1rem' }}>未完了のタスクはありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {incompleteTodos.map(todo => (
              <div key={todo.TaskID} className="card" style={{ display: 'flex', alignItems: 'center', padding: '1rem', transition: 'box-shadow 0.2s' }}>
                <input 
                  type="checkbox" 
                  checked={false} 
                  onChange={() => toggleTodoStatus(todo)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', marginRight: '1rem', accentColor: 'var(--text-main)' }}
                />
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{todo.Content}</span>
                  {formatDeadline(todo.Deadline)}
                </div>
                <button 
                  onClick={() => handleDelete(todo.TaskID)}
                  style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: '0.5rem', fontSize: '1.5rem', lineHeight: 1 }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-sub)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          完了 ({completeTodos.length})
        </h2>
        
        {completeTodos.length === 0 ? (
          <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '1rem' }}>完了したタスクはありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {completeTodos.map(todo => (
              <div key={todo.TaskID} className="card" style={{ display: 'flex', alignItems: 'center', padding: '1rem', opacity: 0.6 }}>
                <input 
                  type="checkbox" 
                  checked={true} 
                  onChange={() => toggleTodoStatus(todo)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', marginRight: '1rem', accentColor: 'var(--text-main)' }}
                />
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', color: 'var(--text-sub)', textDecoration: 'line-through' }}>{todo.Content}</span>
                  {formatDeadline(todo.Deadline)}
                </div>
                <button 
                  onClick={() => handleDelete(todo.TaskID)}
                  style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: '0.5rem', fontSize: '1.5rem', lineHeight: 1 }}
                  title="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
