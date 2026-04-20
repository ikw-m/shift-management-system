import { useState } from 'react';
import { LogIn, User } from 'lucide-react';
import { Employee } from '../types';

interface LoginDialogProps {
  employees: Employee[];
  onLogin: (employee: Employee) => void;
}

export function LoginDialog({ employees, onLogin }: LoginDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const employee = employees.find((e) => e.id === selectedEmployeeId);

    if (!employee) {
      setError('従業員を選択してください');
      return;
    }

    if (employee.password !== password) {
      setError('パスワードが正しくありません');
      return;
    }

    onLogin(employee);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">シフト管理システム</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="employee" className="block text-sm mb-2 text-gray-700 font-medium">
              従業員
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              <select
                id="employee"
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-3 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                required
              >
                <option value="">選択してください</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-2 text-gray-700 font-medium">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 rounded-xl text-rose-700 text-sm shadow-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md font-medium"
          >
            ログイン
          </button>
        </form>

        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 shadow-sm">
          <p className="text-xs text-indigo-800">
            デモ用アカウント:
            <br />
            マネージャー: 田中 花子 / password: manager
            <br />
            スタッフ: 佐藤 太郎 / password: staff
          </p>
        </div>
      </div>
    </div>
  );
}
