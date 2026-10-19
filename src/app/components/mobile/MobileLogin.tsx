import { useState, useEffect } from 'react';
import { LogIn, User, Store } from 'lucide-react';
import { Employee, Department } from '../../types';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { MobileDepartmentList } from './MobileDepartmentList';
import { MobileSystemAdminDialog } from './MobileSystemAdminDialog';
import { APP_VERSION } from '../../version';

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
  const [showSystemAdminDialog, setShowSystemAdminDialog] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenancePassword, setMaintenancePassword] = useState('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);

  // 店舗リスト・システム管理者画面から戻った時にパスワード・エラーをクリア
  useEffect(() => {
    if (!showDepartmentList && !showSystemAdminDialog) {
      setPassword('');
      setError('');
      setAccessError('');
    }
  }, [showDepartmentList, showSystemAdminDialog]);

  useEffect(() => {
    const loadMaintenanceMode = async () => {
      try {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
        setMaintenanceMode(data?.value === 'true');
      } catch { setMaintenanceMode(false); }
    };
    loadMaintenanceMode();
  }, []);

  const handleDBStatusClick = async () => {
    if (password !== '') {
      toggleMaintenanceMode(password);
    } else {
      try {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
        if (data !== null) setMaintenanceMode(data.value === 'true');
      } catch { /* ignore */ }
      setMaintenancePassword('');
      setMaintenanceError('');
      setShowMaintenanceModal(true);
    }
  };

  const toggleMaintenanceMode = async (pw: string) => {
    setMaintenanceLoading(true);
    setMaintenanceError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'sysadmin@shift-management.internal',
        password: pw,
      });
      if (error || !data.user) {
        setMaintenanceError('管理者パスワードが正しくありません');
        setMaintenanceLoading(false);
        return;
      }
      await supabase.auth.signOut();
      const newMode = !maintenanceMode;
      await supabase.from('system_settings').upsert({ key: 'maintenance_mode', value: newMode.toString() }, { onConflict: 'key' });
      setMaintenanceMode(newMode);
      setShowMaintenanceModal(false);
      setMaintenancePassword('');
      setPassword('');
      toast.success(newMode ? '🔧 メンテナンスモードをONにしました' : '✅ メンテナンスモードを解除しました');
    } catch {
      setMaintenanceError('エラーが発生しました。再度お試しください。');
    } finally {
      setMaintenanceLoading(false);
    }
  };

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
        // ① storemanager（店舗管理者）で試行
        const storeRes = await supabase.auth.signInWithPassword({
          email: 'storemanager@shift-management.internal',
          password: password
        });
        if (storeRes.data.user && !storeRes.error) {
          await supabase.auth.signOut();
          setError(''); setAccessError('');
          setShowDepartmentList(true);
          return;
        }
        // ② sysadmin（システム管理者）で試行
        const sysRes = await supabase.auth.signInWithPassword({
          email: 'sysadmin@shift-management.internal',
          password: password
        });
        if (sysRes.data.user && !sysRes.error) {
          await supabase.auth.signOut();
          setError(''); setAccessError('');
          setShowSystemAdminDialog(true);
          return;
        }
        setAccessError('店舗情報のメンテナンス権限がありません！');
        setTimeout(() => setAccessError(''), 3000);
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
    // システム管理者従業員はメンテナンス中もログイン可能
    if (maintenanceMode && employee.adminType !== 'system_admin') {
      setError('現在メンテナンス中のためログインできません'); return;
    }
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
  if (showSystemAdminDialog) {
    return <MobileSystemAdminDialog onClose={() => setShowSystemAdminDialog(false)} />;
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
        <span className="text-sm text-gray-500 mt-1">{APP_VERSION}</span>
        <div className="flex flex-col items-center mt-2">
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-yellow-400'}`} />
            <button
              type="button"
              onClick={handleDBStatusClick}
              className="text-xs text-gray-500 hover:underline focus:outline-none"
              title="タップでメンテナンスモード管理"
            >
              {dbStatus === 'connected' ? 'DB接続済み' : dbStatus === 'error' ? 'DB接続エラー' : '確認中...'}
            </button>
          </div>
          {maintenanceMode !== null && (
            <div className={`text-xs mt-0.5 ${maintenanceMode ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
              {maintenanceMode ? '⚠️ メンテナンスモード中' : ''}
            </div>
          )}
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

          {maintenanceMode && employees.find(e => e.id === selectedEmployeeId)?.adminType !== 'system_admin' && (
            <div className="p-3 bg-orange-50 border border-orange-300 rounded-2xl text-orange-700 text-sm text-center font-medium">
              ⚠️ メンテナンス中のためログインできません
            </div>
          )}
          <button type="submit" disabled={isLoading || (!!maintenanceMode && employees.find(e => e.id === selectedEmployeeId)?.adminType !== 'system_admin')}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl text-base font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-800 mb-1">🔧 メンテナンスモード管理</h3>
            <p className="text-xs text-gray-500 mb-4">
              現在: {maintenanceMode ? 'ON（メンテナンス中）' : 'OFF（通常運用中）'}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">システム管理者パスワード</label>
              <input
                type="password"
                value={maintenancePassword}
                onChange={e => { setMaintenancePassword(e.target.value); setMaintenanceError(''); }}
                className="w-full px-4 py-3 bg-gray-50 border border-indigo-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="パスワードを入力"
                autoFocus
              />
              {maintenanceError && <p className="text-xs text-red-600 mt-1">{maintenanceError}</p>}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowMaintenanceModal(false); setMaintenancePassword(''); setMaintenanceError(''); }}
                className="flex-1 py-3 border border-gray-300 rounded-2xl text-sm text-gray-600 active:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => toggleMaintenanceMode(maintenancePassword)}
                disabled={maintenanceLoading || !maintenancePassword}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-semibold active:opacity-80 disabled:opacity-50"
              >
                {maintenanceLoading ? '処理中...' : maintenanceMode ? 'モード解除' : 'ONにする'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
