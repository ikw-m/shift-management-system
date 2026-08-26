import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Employee, shiftTypeConfig, wishLevelConfig } from '../types';
import { TimeSelect } from './TimeSelect';

const DAY_OPTIONS = [
  { value: '1', label: '月' },
  { value: '2', label: '火' },
  { value: '3', label: '水' },
  { value: '4', label: '木' },
  { value: '5', label: '金' },
  { value: '6', label: '土' },
  { value: '0', label: '日' },
];

interface EditEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  employees: Employee[];
  templateMode?: boolean;
  onEdit: (
    id: string,
    name: string,
    position: string,
    isManager: boolean,
    password: string,
    defaultStartTime?: string,
    defaultEndTime?: string,
    defaultShiftType?: 'karintou' | 'cafe',
    defaultDays?: string[],
    defaultWishLevel?: number,
  ) => void;
}

export function EditEmployeeDialog({ isOpen, onClose, employee, employees, templateMode, onEdit }: EditEmployeeDialogProps) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [defaultStartTime, setDefaultStartTime] = useState('');
  const [defaultEndTime, setDefaultEndTime] = useState('');
  const [defaultShiftType, setDefaultShiftType] = useState<'karintou' | 'cafe' | ''>('');
  const [defaultDays, setDefaultDays] = useState<string[]>([]);
  const [defaultWishLevel, setDefaultWishLevel] = useState<number | undefined>(undefined);

  const toggleDay = (value: string) => {
    setDefaultDays(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  };

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setPosition(employee.position || '');
      setIsManager(employee.role === 'manager' || !!employee.isManager);
      setPassword('');
      setShowPassword(false);
      setError('');
      setDefaultStartTime(employee.defaultStartTime || '');
      setDefaultEndTime(employee.defaultEndTime || '');
      setDefaultShiftType(employee.defaultShiftType || '');
      setDefaultDays(employee.defaultDays || []);
      setDefaultWishLevel(employee.defaultWishLevel ?? undefined);
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!templateMode && !name.trim()) return;

    if (!templateMode && (employee.role === 'manager' || employee.isManager) && !isManager) {
      const otherManagers = employees.filter(
        (emp) => emp.id !== employee.id && (emp.role === 'manager' || emp.isManager)
      );
      if (otherManagers.length === 0) {
        setError('システムには最低1人のマネージャーが必要です。他のマネージャーを追加してから変更してください。');
        return;
      }
    }

    onEdit(
      employee.id,
      name.trim(),
      position.trim(),
      isManager,
      password.trim(),
      defaultStartTime || undefined,
      defaultEndTime || undefined,
      (defaultShiftType || undefined) as 'karintou' | 'cafe' | undefined,
      defaultDays.length > 0 ? defaultDays : undefined,
      defaultWishLevel,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-indigo-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {templateMode ? 'テンプレート設定' : '従業員を編集'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-gray-700">名前</label>
            {templateMode ? (
              <p className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800">{name}</p>
            ) : (
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                autoFocus
              />
            )}
          </div>

          <div>
            <label className="block mb-2 text-gray-700">肩書き（自由入力）</label>
            {templateMode ? (
              <p className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800">
                {position || '（未設定）'}
              </p>
            ) : (
              <input
                id="edit-position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="例：チーフ、アルバイト、副店長"
                className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
            )}
          </div>

          <div>
            <label className="block mb-2 text-gray-700">管理者権限</label>
            {templateMode ? (
              <p className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800">
                {isManager ? 'あり（管理者）' : 'なし（スタッフ）'}
              </p>
            ) : (
              <select
                value={isManager ? 'manager' : 'staff'}
                onChange={(e) => setIsManager(e.target.value === 'manager')}
                className="w-full px-4 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              >
                <option value="staff">なし（スタッフ）</option>
                <option value="manager">あり（管理者）</option>
              </select>
            )}
          </div>

          <div>
            <label htmlFor="edit-password" className="block mb-2 text-gray-700">パスワード</label>
            <div className="relative">
              <input
                id="edit-password"
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' } as React.CSSProperties}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="変更する場合は入力"
                className="w-full px-4 py-2.5 pr-10 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
              {password.length > 0 && (
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                  title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            {templateMode && (
              <p className="text-xs text-gray-500 mb-1">以下は「勤務希望追加ダイアログ」の初期値として使用されます。</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 justify-center">
              <div className="flex flex-col items-start gap-0.5">
                <label className="block mb-1 text-gray-700">勤務開始時間</label>
                <TimeSelect value={defaultStartTime} onChange={setDefaultStartTime} allowEmpty className="w-32 text-base" />
              </div>
              <span className="text-gray-500 mt-5">〜</span>
              <div className="flex flex-col items-start gap-0.5">
                <label className="block mb-1 text-gray-700">勤務終了時間</label>
                <TimeSelect value={defaultEndTime} onChange={setDefaultEndTime} allowEmpty className="w-32 text-base" />
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-gray-700">デフォルト用シフトタイプ</label>
            <div className="flex gap-2">
              {Object.entries(shiftTypeConfig).map(([key, val]) => {
                const isSelected = defaultShiftType === key;
                return (
                  <button key={key} type="button"
                    onClick={() => setDefaultShiftType(isSelected ? '' : key as 'karintou' | 'cafe')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${isSelected ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
                    style={isSelected ? { backgroundColor: val.color } : {}}>
                    {key === 'karintou' ? '◉' : '◆'} {val.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block mb-2 text-gray-700">デフォルト用曜日</label>
            <div className="flex gap-1.5">
              {DAY_OPTIONS.map(({ value, label }) => {
                const selected = defaultDays.includes(value);
                const isSat = value === '6';
                const isSun = value === '0';
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 hover:scale-105 ${
                      selected
                        ? isSat
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : isSun
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-gradient-to-b from-indigo-500 to-purple-500 border-indigo-500 text-white'
                        : isSat
                        ? 'bg-white border-gray-200 text-blue-500'
                        : isSun
                        ? 'bg-white border-gray-200 text-red-500'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block mb-2 text-gray-700">デフォルト用希望レベル</label>
            <div className="flex gap-1.5">
              {[3, 2, 1].map(level => {
                const cfg = wishLevelConfig[level];
                const selected = defaultWishLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDefaultWishLevel(selected ? undefined : level)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 hover:scale-105 ${
                      selected
                        ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    <div className="text-sm leading-none">{cfg.badge}</div>
                    <div className="mt-0.5">{cfg.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">選択中をもう一度押すと解除</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 hover:scale-105 transition-all duration-200 shadow-sm">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
              {templateMode ? '保存' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
