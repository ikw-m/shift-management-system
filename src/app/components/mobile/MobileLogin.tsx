import { useState, useEffect } from 'react';
import { LogIn, User, Store } from 'lucide-react';
import { Employee, Department } from '../../types';
import { supabase } from '../../../lib/supabase';
import { MobileDepartmentList } from './MobileDepartmentList';

interface MobileLoginProps {
  employees: Employee[];
  departments: Department[];
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export function MobileLogin({ employees, departments, onLogin }: MobileLoginProps) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [accessError, setAccessError] = useState('');

  // 店舗リスト画面から戻った時にパスワード・エラーをクリア
  useEffect(() => {
    if (!showDepartmentList) {
      setPassword('');
      setError('');
      setAccessError('');
    }
  }, [showDepartmentList]);

  const sortedDepts = [...departments].sort((a, b) => a.displayOrder - b.displayOrder);
  const filteredEmployees = selectedDepartmentId
    ? employees.filter(e => e.departmentId === selectedDepartmentId)
    : [];

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('employees').select('id').limit(1);
        setDbStatus(error ? 'error' : 'connected');
      } catch { setDbStatus('error'); }
    };
    checkSupabase();
  }, []);

  const handleIconClick = async () => {
    if (selectedDepartmentId === '' && selectedEmployeeId === '') {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'sysadmin@shift-management.internal',
          password: password
        });
        if (data.user && !error) {
          await supabase.auth.signOut();
          setAccessError('');
          setShowDepartmentList(true);
        } else {
          setAccessError('店舗情報のメンテナンス権限がありません！');
          setTimeout(() => setAccessError(''), 3000);
        }
      } catch {
        setAccessError('店舗情報のメンテナンス権限がありません！');
        setTimeout(() => setAccessError(''), 3000);
      }
    } else {
      setAccessError('店舗情報のメンテナンス権限がありません！');
      setTimeout(() => setAccessError(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) { setError('従業員を選択してください'); return; }
    setIsLoading(true);
    setError('');
    try {
      const success = await onLogin(employee.email, password);
      if (!success) setError('パスワードが正しくありません');
    } catch { setError('ログインに失敗しました'); }
    finally { setIsLoading(false); }
  };

  if (showDepartmentList) {
    return <MobileDepartmentList onClose={() => setShowDepartmentList(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-8"
      style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
      {/* ヘッダー */}
      <div className="flex flex-col items-center mb-8">
        <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg mb-3 cursor-pointer active:opacity-80" onClick={handleIconClick}>
          <LogIn className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold select-none">
          シフト管理システム
        </h1>
        <span className="text-sm text-gray-500 mt-1">Ver. 3.3</span>
        <div className="flex items-center gap-1 mt-2">
          <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-yellow-400'}`} />
          <span className="text-xs text-gray-500">
            {dbStatus === 'connected' ? 'DB接続済み' : dbStatus === 'error' ? 'DB接続エラー' : '確認中...'}
          </span>
        </div>
      </div>

      {accessError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-700 text-sm text-center">
          {accessError}
        </div>
      )}

      {/* フォーム */}
      <div className="bg-white rounded-3xl shadow-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 店舗名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">店舗名</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              <select
                value={selectedDepartmentId}
                onChange={e => { setSelectedDepartmentId(e.target.value); setSelectedEmployeeId(''); setError(''); }}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-indigo-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">選択してください</option>
                {sortedDepts.map(d => (
                  <option key={d.id} value={d.id}>{d.departmentName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 従業員 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">従業員</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              <select
                value={selectedEmployeeId}
                onChange={e => { setSelectedEmployeeId(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-indigo-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                required
                disabled={!selectedDepartmentId}
              >
                <option value="">{selectedDepartmentId ? '選択してください' : '先に店舗を選択'}</option>
                {filteredEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}（{emp.position || emp.role}）</option>
                ))}
              </select>
            </div>
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-4 bg-gray-50 border border-indigo-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-sm">{error}</div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl text-base font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50">
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
