import { useState } from 'react';
import { Store, Plus, Edit, Trash2, Save, X, ChevronUp, ChevronDown, User, LogOut } from 'lucide-react';
import { Department } from '../types';
import { useData } from '../context/DataContext';

const employeeColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
];

interface DepartmentListProps {
  onClose: () => void;
}

export function DepartmentList({ onClose }: DepartmentListProps) {
  const { departments, employees, addDepartment, updateDepartment, deleteDepartment, reorderDepartments, addEmployee } = useData();
  const [newName, setNewName] = useState('');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPosition, setNewManagerPosition] = useState('');
  const [newManagerPassword, setNewManagerPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const sorted = [...departments].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleAdd = async () => {
    if (!newName.trim() || !newManagerName.trim() || !newManagerPassword.trim()) {
      alert('店舗名・従業員名・パスワードを全て入力してください');
      return;
    }
    const duplicate = departments.some(d => d.departmentName === newName.trim());
    if (duplicate) {
      alert(`「${newName.trim()}」は既に登録されています。\n別の店舗名を入力してください。`);
      return;
    }
    try {
      // 店舗を追加してIDを取得
      const deptId = await addDepartment(newName.trim());
      // マネージャーを追加（店舗に紐づけ）
      const colorIndex = employees.length % employeeColors.length;
      await addEmployee({
        name: newManagerName.trim(),
        email: `${newManagerName.trim().toLowerCase().replace(/\s/g, '')}_${Date.now()}@example.com`,
        phone: '000-0000-0000',
        position: newManagerPosition.trim() || 'マネージャー',
        role: 'manager',
        password: newManagerPassword,
        color: employeeColors[colorIndex],
        displayOrder: 0,
        departmentId: deptId,
      });
      setNewName('');
      setNewManagerName('');
      setNewManagerPosition('');
      setNewManagerPassword('');
      setIsAdding(false);
    } catch { alert('追加に失敗しました'); }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const duplicate = departments.some(d => d.id !== id && d.departmentName === editName.trim());
    if (duplicate) {
      alert(`「${editName.trim()}」は既に登録されています。\n別の店舗名を入力してください。`);
      return;
    }
    try {
      await updateDepartment(id, editName.trim());
      setEditingId(null);
    } catch { alert('更新に失敗しました'); }
  };

  const handleDelete = async (id: string, name: string) => {
    const deptEmployees = employees.filter(e => e.departmentId === id);
    // 最初に登録されたマネージャーを特定（displayOrder最小）
    const managers = deptEmployees.filter(e => e.role === 'manager' || e.isManager);
    const firstManager = managers.reduce((min, e) => (e.displayOrder ?? 0) < (min.displayOrder ?? 0) ? e : min, managers[0]);
    const others = deptEmployees.filter(e => e.id !== firstManager?.id);
    if (others.length > 0) {
      alert(`「${name}」には最初のマネージャー以外の従業員が${others.length}名登録されています。\n先に従業員を削除してから店舗を削除してください。`);
      return;
    }
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    try {
      await deleteDepartment(id);
    } catch { alert('削除に失敗しました'); }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sorted.findIndex(d => d.id === id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sorted.length - 1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reordered = [...sorted];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];
    try {
      await reorderDepartments(reordered);
    } catch { alert('並び替えに失敗しました'); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 font-bold text-gray-800">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
              <Store className="w-4 h-4 text-white" />
            </div>
            店舗リスト
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200" title="ログアウト">
            <LogOut className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {sorted.map((dept, index) => (
            <div key={dept.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => handleMove(dept.id, 'up')} disabled={index === 0}
                  className={`p-0.5 rounded ${index === 0 ? 'text-gray-300' : 'text-indigo-600 hover:bg-indigo-100'}`}
                  title="上へ移動">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => handleMove(dept.id, 'down')} disabled={index === sorted.length - 1}
                  className={`p-0.5 rounded ${index === sorted.length - 1 ? 'text-gray-300' : 'text-indigo-600 hover:bg-indigo-100'}`}
                  title="下へ移動">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              {editingId === dept.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(dept.id)} className="p-1.5 bg-emerald-600 text-white rounded-lg" title="保存">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-500 text-white rounded-lg" title="キャンセル">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 font-medium text-gray-800">{dept.departmentName}</span>
                  <button onClick={() => { setEditingId(dept.id); setEditName(dept.departmentName); }}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg"
                    title="編集">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(dept.id, dept.departmentName)}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg"
                    title="削除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {isAdding ? (
          <div className="space-y-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
            <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
              <Store className="w-3.5 h-3.5" /> 新しい店舗を追加
            </p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">店舗名 <span className="text-red-500">*</span></label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="例：梅田店"
                className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                autoFocus
              />
            </div>
            <div className="border-t border-indigo-200 pt-3">
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1 mb-2">
                <User className="w-3.5 h-3.5" /> マネージャー情報
              </p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">従業員名 <span className="text-red-500">*</span></label>
                  <input
                    value={newManagerName}
                    onChange={e => setNewManagerName(e.target.value)}
                    placeholder="例：山田 太郎"
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">肩書き（自由入力）</label>
                  <input
                    value={newManagerPosition}
                    onChange={e => setNewManagerPosition(e.target.value)}
                    placeholder="例：チーフ、アルバイト、副店長"
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">管理者権限</label>
                  <select
                    value="manager"
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500"
                  >
                    <option value="manager">あり（管理者）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">パスワード <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={newManagerPassword}
                    onChange={e => setNewManagerPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">追加する</button>
              <button onClick={() => { setIsAdding(false); setNewName(''); setNewManagerName(''); setNewManagerPosition(''); setNewManagerPassword(''); }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm">キャンセル</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)}
            className="w-full py-2.5 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 text-sm font-medium flex items-center justify-center gap-1 hover:bg-indigo-50">
            <Plus className="w-4 h-4" /> 店舗を追加
          </button>
        )}
      </div>
    </div>
  );
}
