import { useState, useEffect } from 'react';
import { LogIn, User, Database } from 'lucide-react';
import { Employee } from '../types';
import { supabase } from '../../lib/supabase';

interface LoginDialogProps {
  employees: Employee[];
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export function LoginDialog({ employees, onLogin }: LoginDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'supabase' | 'checking'>('checking');
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [dbError, setDbError] = useState<string>('');

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.from('employees').select('id').limit(1);
        if (error) {
          setDbStatus('error');
          setDbError(`データベースエラー: ${error.message}`);
          setDataSource('supabase');
        } else {
          setDbStatus('connected');
          setDbError('');
          setDataSource('supabase');
        }
      } catch (err) {
        setDbStatus('error');
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setDbError('Supabaseに接続できません。.envファイルでURLとキーを設定してください。');
        } else {
          setDbError(err instanceof Error ? err.message : '不明なエラー');
        }
        setDataSource('supabase');
      }
    };
    checkSupabase();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const employee = employees.find((e) => e.id === selectedEmployeeId);

    if (!employee) {
      setError('従業員を選択してください');
      setIsLoading(false);
      return;
    }

    try {
      const success = await onLogin(employee.email, password);
      if (!success) {
        setError('パスワードが正しくありません');
      }
    } catch (err) {
      setError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
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
                {employees?.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.position || employee.role})
                  </option>
                )) || null}
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
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
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

        <div className="mt-4 p-4 bg-gray-100 rounded-xl border border-gray-300 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">データソース状態</h3>
          </div>
          <div className="space-y-1 ml-6">
            <p className="text-xs text-gray-600">
              <span className="font-medium">データソース:</span> {dataSource === 'supabase' ? <span className="text-blue-600">Supabase (クラウドDB)</span> : '確認中...'}
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-medium">接続状態:</span>{' '}
              {dbStatus === 'connected' && <span className="text-green-600">✓ 接続成功</span>}
              {dbStatus === 'error' && <span className="text-red-600">✗ 接続エラー</span>}
              {dbStatus === 'checking' && <span className="text-yellow-600">確認中...</span>}
            </p>
            {dbError && (
              <p className="text-xs text-red-600">
                <span className="font-medium">エラー:</span> {dbError}
              </p>
            )}
            <p className="text-xs text-gray-600">
              <span className="font-medium">従業員数:</span> {employees?.length || 0}人
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
