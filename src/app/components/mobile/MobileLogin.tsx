import { useState, useEffect } from 'react';
import { LogIn, User } from 'lucide-react';
import { Employee } from '../../types';
import { supabase } from '../../../lib/supabase';

interface MobileLoginProps {
  employees: Employee[];
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export function MobileLogin({ employees, onLogin }: MobileLoginProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('employees').select('id').limit(1);
        setDbStatus(error ? 'error' : 'connected');
      } catch {
        setDbStatus('error');
      }
    };
    checkSupabase();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) {
      setError('従業員を選択してください');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const success = await onLogin(employee.email, password);
      if (!success) setError('パスワードが正しくありません');
    } catch {
      setError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center px-5 py-8"
      style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}
    >
      {/* ヘッダー */}
      <div className="flex flex-col items-center mb-8">
        <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg mb-3">
          <LogIn className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
          シフト管理システム
        </h1>
        <span className="text-sm text-gray-500 mt-1">Ver. 3.1</span>
        <div className="flex items-center gap-1 mt-2">
          <span
            className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-yellow-400'
            }`}
          />
          <span className="text-xs text-gray-500">
            {dbStatus === 'connected' ? 'DB接続済み' : dbStatus === 'error' ? 'DB接続エラー' : '確認中...'}
          </span>
        </div>
      </div>

      {/* フォーム */}
      <div className="bg-white rounded-3xl shadow-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">従業員を選択</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => { setSelectedEmployeeId(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-indigo-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">選択してください</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}（{emp.position || emp.role}）
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-4 bg-gray-50 border border-indigo-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl text-base font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-5 p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
          <p className="text-xs text-indigo-800 leading-relaxed">
            デモ用アカウント:<br />
            マネージャー: 田中 花子 / password: manager<br />
            スタッフ: 佐藤 太郎 / password: staff
          </p>
        </div>
      </div>
    </div>
  );
}
