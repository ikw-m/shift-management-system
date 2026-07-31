import { useState } from 'react';
import { Users, Plus, Edit, Trash2, Save, X, ChevronUp, ChevronDown, Eye, EyeOff, LogOut } from 'lucide-react';
import { Employee } from '../../types';
import { useData } from '../../context/DataContext';

interface MobileEmployeeListProps {
  currentUser: Employee;
  departmentName: string;
  onBack: () => void;
  onLogout: () => void;
}

const employeeColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export function MobileEmployeeList({ currentUser, departmentName, onBack, onLogout }: MobileEmployeeListProps) {
  const { employees, addEmployee, updateEmployee, deleteEmployee, reloadData, reorderEmployees } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editIsManager, setEditIsManager] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newIsManager, setNewIsManager] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 同じ店舗の従業員のみ表示
  const deptEmployees = [...employees]
    .filter(e => e.departmentId === currentUser.departmentId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const handleAdd = async () => {
    if (!newName.trim() || !newPassword.trim()) return;
    const maxOrder = Math.max(...deptEmployees.map(e => e.displayOrder ?? 0), -1);
    try {
      await addEmployee({
        name: newName.trim(),
        email: `${newName.trim().toLowerCase().replace(/\s/g, '')}_${Date.now()}@example.com`,
        phone: '000-0000-0000',
        position: newPosition.trim(),
        role: newIsManager ? 'manager' : 'staff',
        password: newPassword,
        color: employeeColors[deptEmployees.length % employeeColors.length],
        displayOrder: maxOrder + 1,
        departmentId: currentUser.departmentId,
      });
      setNewName(''); setNewPosition(''); setNewIsManager(false); setNewPassword('');
      setIsAdding(false);
    } catch { alert('追加に失敗しました'); }
  };

  const handleSaveEdit = async (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp || !editName.trim()) return;

    // マネージャーからスタッフに変更する場合、他にマネージャーがいるか確認
    const isCurrentlyManager = emp.role === 'manager' || emp.isManager;
    if (isCurrentlyManager && !editIsManager) {
      const otherManagers = deptEmployees.filter(
        e => e.id !== id && (e.role === 'manager' || e.isManager)
      );
      if (otherManagers.length === 0) {
        alert('システムには最低1人のマネージャーが必要です。\n他のマネージャーを追加してから変更してください。');
        return;
      }
    }

    try {
      await updateEmployee(id, {
        name: editName.trim(),
        email: emp.email,
        phone: emp.phone,
        position: editPosition.trim(),
        role: editIsManager ? 'manager' : 'staff',
        password: editPassword || emp.password,
        color: emp.color,
        displayOrder: emp.displayOrder,
        departmentId: emp.departmentId,
      });
      setEditingId(null);
    } catch { alert('更新に失敗しました'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser.id) { alert('自分自身は削除できません'); return; }

    // 自店舗の最後のマネージャーは削除できない
    const emp = deptEmployees.find(e => e.id === id);
    const isManager = emp?.role === 'manager' || emp?.isManager;
    if (isManager) {
      const otherManagers = deptEmployees.filter(e => e.id !== id && (e.role === 'manager' || e.isManager));
      if (otherManagers.length === 0) {
        alert('システムには最低1人のマネージャーが必要です。\n他のマネージャーを追加してから削除してください。');
        return;
      }
    }

    if (!window.confirm(`${name}を削除しますか？`)) return;
    try { await deleteEmployee(id); } catch { alert('削除に失敗しました'); }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = deptEmployees.findIndex(e => e.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === deptEmployees.length - 1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...deptEmployees];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    try {
      await reorderEmployees(reordered);
    } catch { alert('並び替えに失敗しました'); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
        {/* システム名行 */}
        <div className="px-4 h-9 flex items-center gap-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
            シフト管理システム
          </span>
          <span className="text-gray-500" style={{ fontSize: '0.7em' }}>Ver. 3.3</span>
          {departmentName && (
            <span className="text-xs font-bold text-indigo-700 ml-1">｜ {departmentName}</span>
          )}
        </div>
        {/* ユーザー情報行 */}
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentUser.color }} />
            <span className="font-semibold text-gray-800 text-sm">{currentUser.name}</span>
            <span className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              従業員リスト
            </span>
          </div>
          <button onClick={onBack} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 active:bg-indigo-100">
            メニュー
          </button>
        </div>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto py-3 px-4 space-y-2">
        {deptEmployees.map((emp, index) => (
          <div key={emp.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {editingId === emp.id ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.color }} />
                  <span className="text-sm font-semibold text-gray-500">編集中</span>
                </div>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  placeholder="氏名" className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={editPosition} onChange={e => setEditPosition(e.target.value)}
                  placeholder="肩書き（例：チーフ、アルバイト）" className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select value={editIsManager ? 'manager' : 'staff'} onChange={e => setEditIsManager(e.target.value === 'manager')}
                  className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="staff">管理者権限：なし（スタッフ）</option>
                  <option value="manager">管理者権限：あり（管理者）</option>
                </select>
                <div className="relative">
                  <input value={editPassword} onChange={e => setEditPassword(e.target.value)}
                    placeholder="変更する場合は入力"
                    type="text"
                    style={{ WebkitTextSecurity: showEditPassword ? 'none' : 'disc' } as React.CSSProperties}
                    className="w-full px-3 py-2.5 pr-10 border border-indigo-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {editPassword.length > 0 && (
                    <button type="button" onClick={() => setShowEditPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-indigo-600">
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(emp.id)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 active:scale-95">
                    <Save className="w-4 h-4" /> 保存
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm active:scale-95">
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleMove(emp.id, 'up')} disabled={index === 0}
                    className={`p-0.5 rounded ${index === 0 ? 'text-gray-300' : 'text-indigo-600 active:bg-indigo-100'}`}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleMove(emp.id, 'down')} disabled={index === deptEmployees.length - 1}
                    className={`p-0.5 rounded ${index === deptEmployees.length - 1 ? 'text-gray-300' : 'text-indigo-600 active:bg-indigo-100'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: emp.color }}>
                  {emp.name.charAt(0)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{emp.name}</p>
                  <p className="text-xs text-gray-500">{emp.position || emp.role}</p>
                </div>
                <button onClick={() => { setEditingId(emp.id); setEditName(emp.name); setEditPosition(emp.position || ''); setEditIsManager(emp.role === 'manager' || !!emp.isManager); setEditPassword(''); }}
                  className="p-2 text-indigo-600 bg-indigo-50 rounded-xl active:scale-95">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(emp.id, emp.name)}
                  className="p-2 text-rose-600 bg-rose-50 rounded-xl active:scale-95"
                  title="削除">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 追加エリア */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2 bg-white border-t border-gray-200">
        {isAdding ? (
          <div className="space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="氏名"
              className="w-full px-4 py-3 border border-indigo-200 rounded-2xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            <input value={newPosition} onChange={e => setNewPosition(e.target.value)} placeholder="肩書き（例：チーフ、アルバイト）"
              className="w-full px-4 py-3 border border-indigo-200 rounded-2xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={newIsManager ? 'manager' : 'staff'} onChange={e => setNewIsManager(e.target.value === 'manager')}
              className="w-full px-4 py-3 border border-indigo-200 rounded-2xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="staff">管理者権限：なし（スタッフ）</option>
              <option value="manager">管理者権限：あり（管理者）</option>
            </select>
            <div className="relative">
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="パスワード"
                type="text"
                style={{ WebkitTextSecurity: showNewPassword ? 'none' : 'disc' } as React.CSSProperties}
                className="w-full px-4 py-3 pr-12 border border-indigo-200 rounded-2xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {newPassword.length > 0 && (
                <button type="button" onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-indigo-600">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-sm font-semibold active:scale-95">
                追加する
              </button>
              <button onClick={() => setIsAdding(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-2xl text-sm active:scale-95">
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)}
            className="w-full py-3 border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 text-sm font-medium flex items-center justify-center gap-1 active:bg-indigo-50">
            <Plus className="w-4 h-4" /> 従業員を追加
          </button>
        )}
      </div>
    </div>
  );
}
