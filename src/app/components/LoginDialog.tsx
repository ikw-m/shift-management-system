import { useState, useEffect } from 'react';
import { LogIn, User, Database, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Employee } from '../types';

interface LoginDialogProps {
  employees: Employee[];
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export function LoginDialog({ employees, onLogin }: LoginDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbError, setDbError] = useState<string>('');
  const [dataSource, setDataSource] = useState<'localStorage' | 'supabase'>('localStorage');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      console.log('🔍 Supabase接続確認中...');
      const { data, error } = await supabase.from('employees').select('count');
      if (error) {
        console.error('❌ Supabase接続エラー:', error);
        setDbStatus('error');
        setDbError(error.message);
        setDataSource('localStorage');
      } else {
        console.log('✅ Supabase接続成功:', data);
        setDbStatus('connected');
        setDataSource('supabase');
      }
    } catch (err) {
      console.error('❌ Supabase接続例外:', err);
      setDbStatus('error');
      setDbError(err instanceof Error ? err.message : '不明なエラー');
      setDataSource('localStorage');
    }
  };

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

        {/* デバッグ情報 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <Database className="w-4 h-4" />
            <span>データソース状態</span>
          </div>

          <div className="space-y-1 pl-6">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">接続状態:</span>
              {dbStatus === 'checking' && <span className="text-yellow-600">確認中...</span>}
              {dbStatus === 'connected' && <span className="text-green-600 font-semibold">✓ Supabase接続成功</span>}
              {dbStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-semibold">接続エラー</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">データソース:</span>
              <span className={dataSource === 'supabase' ? 'text-blue-600 font-semibold' : 'text-orange-600 font-semibold'}>
                {dataSource === 'supabase' ? 'Supabase (クラウド)' : 'LocalStorage (ローカル)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">従業員数:</span>
              <span className="text-gray-800">{employees?.length || 0}人</span>
            </div>

            {dbError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                <div className="font-semibold">エラー詳細:</div>
                <div className="break-words">{dbError}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
