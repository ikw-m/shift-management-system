import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Employee } from '../types';

interface EditEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  employees: Employee[];
  onEdit: (id: string, name: string, position: string, isManager: boolean, password: string) => void;
}

export function EditEmployeeDialog({ isOpen, onClose, employee, employees, onEdit }: EditEmployeeDialogProps) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setPosition(employee.position || '');
      setIsManager(employee.role === 'manager' || !!employee.isManager);
      setPassword('');
      setShowPassword(false);
      setError('');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return;

    // マネージャーからスタッフに変更する場合、他にマネージャーがいるか確認
    if ((employee.role === 'manager' || employee.isManager) && !isManager) {
      const otherManagers = employees.filter(
        (emp) => emp.id !== employee.id && (emp.role === 'manager' || emp.isManager)
      );
      if (otherManagers.length === 0) {
        setError('システムには最低1人のマネージャーが必要です。他のマネージャーを追加してから変更してください。');
        return;
      }
    }

    onEdit(employee.id, name.trim(), position.trim(), isManager, password.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-indigo-100 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">従業員を編集</h3>
          <button onClick={onClose} className="p-2 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block mb-2 text-gray-700">名前</label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="edit-position" className="block mb-2 text-gray-700">肩書き（自由入力）</label>
            <input
              id="edit-position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="例：チーフ、アルバイト、副店長"
              className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block mb-2 text-gray-700">管理者権限</label>
            <select
              value={isManager ? 'manager' : 'staff'}
              onChange={(e) => setIsManager(e.target.value === 'manager')}
              className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            >
              <option value="staff">なし（スタッフ）</option>
              <option value="manager">あり（管理者）</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-password" className="block mb-2 text-gray-700">パスワード</label>
            <div className="relative">
              <input
                id="edit-password"
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' } as React.CSSProperties}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="変更する場合は入力"
                className="w-full px-4 py-2.5 pr-10 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
              {password.length > 0 && (
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                  title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
              更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
