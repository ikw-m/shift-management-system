import { useState } from 'react';
import { X } from 'lucide-react';

interface AddEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, position: string, isManager: boolean, password: string) => void;
}

export function AddEmployeeDialog({ isOpen, onClose, onAdd }: AddEmployeeDialogProps) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && password.trim()) {
      onAdd(name.trim(), position.trim(), isManager, password.trim());
      setName('');
      setPosition('');
      setIsManager(false);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-indigo-100 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">従業員を追加</h3>
          <button onClick={onClose} className="p-2 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block mb-2 text-gray-700">名前</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="position" className="block mb-2 text-gray-700">肩書き（自由入力）</label>
            <input
              id="position"
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
            <label htmlFor="password" className="block mb-2 text-gray-700">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
