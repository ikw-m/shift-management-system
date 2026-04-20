import { useState } from 'react';
import { X } from 'lucide-react';

interface AddEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, role: string, password: string) => void;
}

const roleOptions = ['マネージャー', 'スタッフ'];

export function AddEmployeeDialog({ isOpen, onClose, onAdd }: AddEmployeeDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('スタッフ');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && role.trim() && password.trim()) {
      onAdd(name.trim(), role.trim(), password.trim());
      setName('');
      setRole('スタッフ');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-indigo-100 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">従業員を追加</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block mb-2 text-gray-700">
              名前
            </label>
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
            <label htmlFor="role" className="block mb-2 text-gray-700">
              役職
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block mb-2 text-gray-700">
              パスワード
            </label>
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
