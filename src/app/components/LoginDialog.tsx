import { useState, useEffect } from 'react';
import { LogIn, User, Database, Store } from 'lucide-react';
import { Employee, Department } from '../types';
import { supabase } from '../../lib/supabase';
import { DepartmentList } from './DepartmentList';
import { ShiftPrintScreen } from './ShiftPrintScreen';

interface LoginDialogProps {
  employees: Employee[];
  departments: Department[];
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export function LoginDialog({ employees, departments, onLogin }: LoginDialogProps) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [showShiftPrint, setShowShiftPrint] = useState(false);
  const [accessError, setAccessError] = useState('');

  // 店舗リスト・印刷画面から戻った時にパスワード・エラーをクリア
  useEffect(() => {
    if (!showDepartmentList && !showShiftPrint) {
      setPassword('');
      setError('');
      setAccessError('');
    }
  }, [showDepartmentList, showShiftPrint]);

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
    if (selectedDepartmentId !== '' && selectedEmployeeId === '' && password === '') {
      // シフト管理表印刷
      setError(''); setAccessError('');
      setShowShiftPrint(true);
    } else if (selectedDepartmentId === '' && selectedEmployeeId === '') {
      // システム管理者認証（Supabase Auth）
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'sysadmin@shift-management.internal',
          password: password
        });
        if (data.user && !error) {
          await supabase.auth.signOut();
          setError(''); setAccessError('');
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
    setIsLoading(true);
    setError('');
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) { setError('従業員を選択してください'); setIsLoading(false); return; }
    try {
      const success = await onLogin(employee.email, password);
      if (!success) setError('パスワードが正しくありません');
    } catch { setError('ログインに失敗しました'); }
    finally { setIsLoading(false); }
  };

  const selectedDeptName = departments.find(d => d.id === selectedDepartmentId)?.departmentName ?? '';

  return (
    <>
      {showDepartmentList && <DepartmentList onClose={() => setShowDepartmentList(false)} />}
      {showShiftPrint && (
        <ShiftPrintScreen
          departmentId={selectedDepartmentId}
          departmentName={selectedDeptName}
          onClose={() => setShowShiftPrint(false)}
        />
      )}
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-8 w-full max-w-md shadow-2xl">
          <div className="flex items-center gap-3 mb-6 justify-center select-none">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg cursor-pointer" onClick={handleIconClick}>
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">シフト管理システム</h1>
              <span className="text-xs text-gray-500 ml-1">Ver. 8.0</span>
            </div>
          </div>

          {accessError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-sm text-center">
              {accessError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 店舗名 */}
            <div>
              <label className="block text-sm mb-2 text-gray-700 font-medium">店舗名</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <select
                  value={selectedDepartmentId}
                  onChange={e => { setSelectedDepartmentId(e.target.value); setSelectedEmployeeId(''); setError(''); }}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
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
              <label className="block text-sm mb-2 text-gray-700 font-medium">従業員</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <select
                  value={selectedEmployeeId}
                  onChange={e => { setSelectedEmployeeId(e.target.value); setError(''); }}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label className="block text-sm mb-2 text-gray-700 font-medium">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                placeholder="パスワードを入力"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md font-medium disabled:opacity-50">
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-gray-100 rounded-xl border border-gray-300">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-700">DB状態</span>
              <span className={`text-xs ml-2 ${dbStatus === 'connected' ? 'text-green-600' : dbStatus === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                {dbStatus === 'connected' ? '✓ 接続済み' : dbStatus === 'error' ? '✗ エラー' : '確認中...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
