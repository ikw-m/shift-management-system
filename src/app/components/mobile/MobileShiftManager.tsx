import { useState, useEffect } from 'react';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Check, XCircle, Edit, Save, X, Trash2, Clock, CheckCircle, Plus
} from 'lucide-react';
import { Employee, Availability, ShiftCondition, shiftTypeConfig } from '../../types';
import { useData } from '../../context/DataContext';

interface MobileShiftManagerProps {
  currentUser: Employee;
  employees: Employee[];
  availabilities: Availability[];
  onAddAvailability: (a: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (id: string, startTime: string, endTime: string) => void;
  onRemoveAvailability: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MobileShiftManager({
  currentUser,
  employees,
  availabilities,
  onAddAvailability,
  onEditAvailability,
  onRemoveAvailability,
  onApprove,
  onReject,
}: MobileShiftManagerProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newShiftType, setNewShiftType] = useState<'karintou' | 'cafe'>('karintou');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUser.id);
  const [shiftCondition, setShiftCondition] = useState<ShiftCondition | null>(null);

  const { getShiftCondition } = useData();
  const isManager = currentUser.role === 'manager' || currentUser.isManager === true;

  useEffect(() => {
    getShiftCondition(year).then(setShiftCondition);
  }, [year, getShiftCondition]);

  const clearDayState = () => {
    setExpandedDay(null);
    setAddingDay(null);
    setEditingId(null);
  };

  const prevMonth = () => {
    clearDayState();
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    clearDayState();
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // ========== シフト条件ロジック（PC版と同一） ==========
  const getHolidays = (targetYear: number): string[] => {
    if (!shiftCondition || shiftCondition.year !== targetYear) return [];
    const row = shiftCondition.rows.find(r => r.type === 'holiday');
    return row ? row.dates : [];
  };

  const isHoliday = (date: Date): boolean => {
    const holidays = getHolidays(date.getFullYear());
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    return holidays.includes(key);
  };

  const getRequiredStaff = (date: Date): number => {
    if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return 0;
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    const springSale = shiftCondition.rows.find(r => r.type === 'springSale');
    if (springSale?.dates.includes(key)) return springSale.requiredStaff;
    const summerSale = shiftCondition.rows.find(r => r.type === 'summerSale');
    if (summerSale?.dates.includes(key)) return summerSale.requiredStaff;
    const winterSale = shiftCondition.rows.find(r => r.type === 'winterSale');
    if (winterSale?.dates.includes(key)) return winterSale.requiredStaff;
    if (isHoliday(date)) {
      const row = shiftCondition.rows.find(r => r.type === 'holiday');
      return row ? row.requiredStaff : 0;
    }
    const dayMap: Record<number, string> = {
      0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
      4: 'thursday', 5: 'friday', 6: 'saturday',
    };
    const row = shiftCondition.rows.find(r => r.type === dayMap[date.getDay()]);
    return row ? row.requiredStaff : 0;
  };

  // ========== ユーティリティ ==========
  const getShiftsForDate = (date: Date) =>
    availabilities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate();
    });

  const getEmployee = (id: string) =>
    id === currentUser.id ? currentUser : employees.find(e => e.id === id);

  const getApprovedCount = (date: Date) =>
    getShiftsForDate(date).filter(a => a.status === 'approved').length;

  const isSaleDay = (date: Date): boolean => {
    if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return false;
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    return ['springSale', 'summerSale', 'winterSale'].some(type => {
      const row = shiftCondition.rows.find(r => r.type === type);
      return row?.dates.includes(key);
    });
  };

  const isSpecialDay = (date: Date) =>
    isSunday(date) || isSaturday(date) || isHoliday(date);

  const getDayBgClass = (date: Date) => {
    if (isSpecialDay(date)) return 'bg-red-50 border-red-200';
    if (isSaleDay(date)) return 'bg-green-50 border-green-200';
    return 'bg-white border-gray-100';
  };

  const getDayHeaderBgClass = (date: Date) => {
    if (isSpecialDay(date)) return 'bg-red-100';
    if (isSaleDay(date)) return 'bg-green-100';
    return 'bg-gray-50';
  };

  const getDayTextClass = (date: Date) => {
    if (isSunday(date) || isHoliday(date)) return 'text-red-600';
    if (isSaturday(date)) return 'text-blue-600';
    if (isSaleDay(date)) return 'text-green-700';
    return 'text-gray-800';
  };

  const statusConfig = {
    pending:  { label: '承認待ち', icon: Clock,       cls: 'bg-yellow-50 border-yellow-300 text-yellow-900' },
    approved: { label: '承認済み', icon: CheckCircle, cls: 'bg-green-50 border-green-300 text-green-900' },
    rejected: { label: '却下',     icon: XCircle,     cls: 'bg-red-50 border-red-300 text-red-900' },
  };

  const handleAdd = (day: number) => {
    const date = new Date(year, month - 1, day);
    onAddAvailability({
      employeeId: isManager ? selectedEmployeeId : currentUser.id,
      date,
      startTime: newStartTime,
      endTime: newEndTime,
      shiftType: newShiftType,
    });
    setAddingDay(null);
    setNewStartTime('08:00');
    setNewEndTime('17:00');
    setNewShiftType('karintou');
    setSelectedEmployeeId(currentUser.id);
  };

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));

  return (
    <div className="flex flex-col h-full">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={prevMonth} className="p-2 rounded-xl bg-gray-100 active:bg-gray-200">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="font-bold text-gray-800 text-lg">{year}年 {month}月</span>
        <button onClick={nextMonth} className="p-2 rounded-xl bg-gray-100 active:bg-gray-200">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <span className="text-xs text-gray-500">凡例：</span>
        <span
          className="text-xs px-2 py-0.5 rounded font-semibold text-white"
          style={{ backgroundColor: shiftTypeConfig.karintou.color }}
        >
          ◉ {shiftTypeConfig.karintou.label}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded font-semibold text-white"
          style={{ backgroundColor: shiftTypeConfig.cafe.color }}
        >
          ◆ {shiftTypeConfig.cafe.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
          休日
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
          セール
        </span>
      </div>

      {/* 日付リスト */}
      <div className="flex-1 overflow-y-auto bg-gray-50 py-2 px-3 space-y-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const date = new Date(year, month - 1, day);
          const shifts = getShiftsForDate(date);
          const approvedCount = getApprovedCount(date);
          const required = getRequiredStaff(date);
          const isExpanded = expandedDay === day;
          const isAdding = addingDay === day;
          const dayLabel = format(date, 'd日(E)', { locale: ja });
          const achieved = required > 0 && approvedCount >= required;
          const myShifts = shifts.filter(a => a.employeeId === currentUser.id);

          return (
            <div
              key={day}
              className={`rounded-2xl shadow-sm overflow-hidden border ${getDayBgClass(date)}`}
            >
              {/* 日付ヘッダー行 */}
              <button
                onClick={() => {
                  setExpandedDay(isExpanded ? null : day);
                  setAddingDay(null);
                  setEditingId(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 ${getDayHeaderBgClass(date)} active:opacity-80`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-base ${getDayTextClass(date)}`}>
                    {dayLabel}
                    {isHoliday(date) && <span className="ml-1 text-xs font-normal text-red-500">祝</span>}
                  </span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    achieved ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {approvedCount}/{required}人
                    {achieved && ' ✓'}
                  </span>
                  {shifts.filter(a => a.status === 'pending').length > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full border border-yellow-300">
                      待ち{shifts.filter(a => a.status === 'pending').length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {shifts.filter(a => a.status === 'approved').slice(0, 4).map(a => (
                      <span
                        key={a.id}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}
                      />
                    ))}
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* 展開パネル */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-2 space-y-2">

                  {/* 全員のシフト一覧 */}
                  {shifts.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-1">シフトなし</p>
                  ) : (
                    <div className="space-y-1.5">
                      {shifts.map(a => {
                        const emp = getEmployee(a.employeeId);
                        const canEdit = isManager || (a.status === 'pending' && a.employeeId === currentUser.id);
                        const canDelete = canEdit;
                        const isEditing = editingId === a.id;

                        return (
                          <div
                            key={a.id}
                            className="rounded-xl border overflow-hidden"
                          >
                            {/* シフトタイプバナー */}
                            <div
                              className="px-3 py-1 flex items-center gap-2"
                              style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}
                            >
                              <span className="text-white text-xs font-bold">
                                {a.shiftType === 'karintou' ? '◉' : '◆'} {shiftTypeConfig[a.shiftType].label}
                              </span>
                            </div>

                            {/* シフト詳細 */}
                            <div className={`px-3 py-2 ${statusConfig[a.status].cls}`}>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="time"
                                      value={editStartTime}
                                      onChange={e => setEditStartTime(e.target.value)}
                                      className="flex-1 px-2 py-1.5 border border-indigo-200 rounded-lg text-sm bg-white"
                                    />
                                    <span className="text-gray-400 text-xs">〜</span>
                                    <input
                                      type="time"
                                      value={editEndTime}
                                      onChange={e => setEditEndTime(e.target.value)}
                                      className="flex-1 px-2 py-1.5 border border-indigo-200 rounded-lg text-sm bg-white"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        onEditAvailability(a.id, editStartTime, editEndTime);
                                        setEditingId(null);
                                      }}
                                      className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs flex items-center justify-center gap-1 active:scale-95"
                                    >
                                      <Save className="w-3 h-3" /> 保存
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="flex-1 py-1.5 bg-gray-500 text-white rounded-lg text-xs active:scale-95"
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {/* 従業員名 */}
                                    {emp && (
                                      <div className="flex items-center gap-1">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: emp.color }}
                                        />
                                        <span className="text-xs font-semibold text-gray-700">{emp.name}</span>
                                      </div>
                                    )}
                                    <span className="text-sm font-medium">
                                      {a.startTime}〜{a.endTime}
                                    </span>
                                    <span className="text-xs">{statusConfig[a.status].label}</span>
                                  </div>

                                  {/* アクションボタン */}
                                  <div className="flex gap-1">
                                    {/* 承認待ち → マネージャーは承認・却下 */}
                                    {a.status === 'pending' && isManager && (
                                      <>
                                        <button
                                          onClick={() => onApprove(a.id)}
                                          className="p-1.5 bg-green-600 text-white rounded-lg active:scale-95"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => onReject(a.id)}
                                          className="p-1.5 bg-red-600 text-white rounded-lg active:scale-95"
                                        >
                                          <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    {/* 承認済み → マネージャーは却下に変更 */}
                                    {a.status === 'approved' && isManager && (
                                      <button
                                        onClick={() => onReject(a.id)}
                                        className="p-1.5 bg-red-600 text-white rounded-lg active:scale-95"
                                        title="却下に変更"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {/* 編集・削除（自分のシフト or マネージャー） */}
                                    {canEdit && (
                                      <button
                                        onClick={() => {
                                          setEditingId(a.id);
                                          setEditStartTime(a.startTime);
                                          setEditEndTime(a.endTime);
                                        }}
                                        className="p-1.5 bg-blue-100 rounded-lg active:scale-95"
                                        title="編集"
                                      >
                                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        onClick={() => onRemoveAvailability(a.id)}
                                        className="p-1.5 bg-red-100 rounded-lg active:scale-95"
                                        title="削除"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* シフト追加フォーム */}
                  {isAdding ? (
                    <div className="bg-white rounded-xl border border-indigo-200 p-3 space-y-3">
                      <p className="text-xs font-semibold text-indigo-700">シフトを追加</p>
                      {/* マネージャーの場合は従業員選択ドロップダウンを表示 */}
                      {isManager && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">対象スタッフ</label>
                          <select
                            value={selectedEmployeeId}
                            onChange={e => setSelectedEmployeeId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {[currentUser, ...employees.filter(e => e.id !== currentUser.id)].map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}{emp.id === currentUser.id ? '（自分）' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">開始</label>
                          <input
                            type="time"
                            value={newStartTime}
                            onChange={e => setNewStartTime(e.target.value)}
                            className="w-full px-2 py-2.5 bg-gray-50 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <span className="text-gray-400 mt-4">〜</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">終了</label>
                          <input
                            type="time"
                            value={newEndTime}
                            onChange={e => setNewEndTime(e.target.value)}
                            className="w-full px-2 py-2.5 bg-gray-50 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {Object.entries(shiftTypeConfig).map(([key, val]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNewShiftType(key as 'karintou' | 'cafe')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${
                              newShiftType === key
                                ? 'border-transparent text-white'
                                : 'border-gray-200 text-gray-600 bg-white'
                            }`}
                            style={newShiftType === key ? { backgroundColor: val.color } : {}}
                          >
                            {key === 'karintou' ? '◉' : '◆'} {val.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdd(day)}
                          className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold active:scale-95"
                        >
                          追加する
                        </button>
                        <button
                          onClick={() => setAddingDay(null)}
                          className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm active:scale-95"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingDay(day);
                        setSelectedEmployeeId(currentUser.id);
                      }}
                      className="w-full py-2.5 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 text-sm font-medium flex items-center justify-center gap-1 active:bg-indigo-50"
                    >
                      <Plus className="w-4 h-4" />
                      {isManager ? 'シフトを追加' : '自分のシフトを追加'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
