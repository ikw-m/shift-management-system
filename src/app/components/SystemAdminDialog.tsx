import { useState } from 'react';
import { X, Plus, ShieldCheck, User, Store } from 'lucide-react';
import { useData } from '../context/DataContext';

const employeeColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
];

interface SystemAdminDialogProps {
  onClose: () => void;
}

export function SystemAdminDialog({ onClose }: SystemAdminDialogProps) {
  const { departments, employees, addEmployee, deleteEmployee, updateEmployee } = useData();

  // システム管理者従業員のみ
  const adminEmployees = employees.filter(e => e.adminType === 'system_admin');

  // 追加フォーム
  const [isAdding, setIsAdding] = useState(false);
  // 店舗: 既存選択 or 新規入力
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [deptMode, setDeptMode] = useState<'select' | 'input'>('select');
  // 従業員: 既存選択 or 新規入力
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [empMode, setEmpMode] = useState<'select' | 'input'>('select');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedDepts = [...departments].sort((a, b) => a.displayOrder - b.displayOrder);

  const resetForm = () => {
    setSelectedDeptId('');
    setNewDeptName('');
    setDeptMode('select');
    setSelectedEmpId('');
    setNewEmpName('');
    setEmpMode('select');
    setNewPassword('');
    setIsAdding(false);
  };

  // 既存従業員をシステム管理者に昇格
  const handleAdd = async () => {
    // 既存従業員選択時はパスワード任意。新規入力時は必須
    const isExistingEmp = empMode === 'select' && selectedEmpId;
    if (!isExistingEmp && !newPassword.trim()) { alert('パスワードを入力してください'); return; }

    setIsSubmitting(true);
    try {
      if (isExistingEmp) {
        // 既存従業員をシステム管理者に設定（パスワードが入力されていれば変更も行う）
        const emp = employees.find(e => e.id === selectedEmpId);
        if (!emp) { setIsSubmitting(false); return; }
        if (!window.confirm(`「${emp.name}」をシステム管理者従業員に設定しますか？`)) { setIsSubmitting(false); return; }
        const updatePayload: any = { ...emp, adminType: 'system_admin' };
        if (newPassword.trim()) updatePayload.password = newPassword.trim();
        try {
          await updateEmployee(selectedEmpId, updatePayload);
        } catch { alert('更新に失敗しました'); }
        resetForm();
        return;
      }

      // 新規従業員を追加
      if (!newEmpName.trim()) { alert('従業員名を入力してください'); setIsSubmitting(false); return; }

      let departmentId: string | undefined;
      if (deptMode === 'select' && selectedDeptId) {
        departmentId = selectedDeptId;
      } else if (deptMode === 'input' && newDeptName.trim()) {
        // 同名店舗チェック
        const existing = departments.find(d => d.departmentName === newDeptName.trim());
        if (existing) {
          departmentId = existing.id;
        } else {
          alert('店舗を選択するか、既存の店舗名を入力してください（新規店舗追加はできません）');
          setIsSubmitting(false);
          return;
        }
      }

      const colorIndex = employees.length % employeeColors.length;
      await addEmployee({
        name: newEmpName.trim(),
        email: `${newEmpName.trim().toLowerCase().replace(/[\s　]/g, '')}_${Date.now()}@example.com`,
        phone: '000-0000-0000',
        position: 'システム管理者',
        role: 'staff',
        password: newPassword.trim(),
        color: employeeColors[colorIndex],
        displayOrder: 0,
        departmentId,
        adminType: 'system_admin',
      } as any);
      resetForm();
    } catch { alert('追加に失敗しました'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    try {
      await updateEmployee(id, { ...emp, adminType: null } as any);
    } catch { alert('解除に失敗しました'); }
  };

  const getDeptName = (deptId?: string) => {
    if (!deptId) return '未設定';
    return departments.find(d => d.id === deptId)?.departmentName ?? '未設定';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-800">システム管理者従業員</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* 登録済み一覧 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">登録済みシステム管理者従業員</h3>
            {adminEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">未登録</p>
            ) : (
              <div className="space-y-2">
                {adminEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: emp.color }}>
                        {emp.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{emp.name}</div>
                        <div className="text-xs text-gray-500">{getDeptName(emp.departmentId)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(emp.id, emp.name)}
                      className="px-2 py-1 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                    >
                      解除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 新規追加フォーム */}
          {isAdding ? (
            <div className="border border-indigo-200 rounded-xl p-4 space-y-4 bg-indigo-50/50">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> 新しいシステム管理者従業員を追加
              </h3>

              {/* 店舗 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">店舗名</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setDeptMode('select')}
                    className={`text-xs px-2 py-1 rounded-lg border ${deptMode === 'select' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    既存から選択
                  </button>
                  <button type="button" onClick={() => setDeptMode('input')}
                    className={`text-xs px-2 py-1 rounded-lg border ${deptMode === 'input' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    名前で指定
                  </button>
                </div>
                {deptMode === 'select' ? (
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                    <select value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                      <option value="">（未設定）</option>
                      {sortedDepts.map(d => (
                        <option key={d.id} value={d.id}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                    placeholder="店舗名を入力"
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                )}
              </div>

              {/* 従業員 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">従業員</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setEmpMode('select')}
                    className={`text-xs px-2 py-1 rounded-lg border ${empMode === 'select' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    既存から選択
                  </button>
                  <button type="button" onClick={() => setEmpMode('input')}
                    className={`text-xs px-2 py-1 rounded-lg border ${empMode === 'input' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    新規入力
                  </button>
                </div>
                {empMode === 'select' ? (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                    <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                      <option value="">選択してください</option>
                      {[...employees]
                        .filter(e => e.adminType !== 'system_admin')
                        .filter(e => !selectedDeptId || e.departmentId === selectedDeptId)
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}（{getDeptName(emp.departmentId)}）</option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)}
                    placeholder="従業員名を入力"
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                )}
              </div>

              {/* パスワード */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  パスワード
                  {empMode === 'select' && selectedEmpId && (
                    <span className="ml-1 text-gray-400 font-normal">（空欄なら変更しません）</span>
                  )}
                </label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder={empMode === 'select' && selectedEmpId ? '変更する場合のみ入力' : 'パスワードを入力'}
                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={resetForm}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  キャンセル
                </button>
                <button type="button" onClick={handleAdd} disabled={isSubmitting}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? '処理中...' : empMode === 'select' && selectedEmpId ? '設定' : '追加'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" />
              新しいシステム管理者従業員を追加
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
