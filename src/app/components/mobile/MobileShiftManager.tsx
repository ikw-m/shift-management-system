import { useState, useEffect, useRef } from 'react';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Check, XCircle, Edit, Save, X, Trash2, Clock, CheckCircle, Plus, Leaf,
  Zap, CheckCheck,
} from 'lucide-react';
import { Employee, Availability, ShiftCondition, shiftTypeConfig, wishLevelConfig } from '../../types';
import { TimeSelect } from '../TimeSelect';
import { useData } from '../../context/DataContext';

interface MobileShiftManagerProps {
  currentUser: Employee;
  employees: Employee[];
  availabilities: Availability[];
  departmentName: string;
  onBack: () => void;
  onAddAvailability: (a: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (id: string, startTime: string, endTime: string, shiftType: 'karintou' | 'cafe', wishLevel: number, isPaidLeave?: boolean) => void;
  onRemoveAvailability: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MobileShiftManager({
  currentUser,
  employees,
  availabilities,
  departmentName,
  onBack,
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
  const [editShiftType, setEditShiftType] = useState<'karintou' | 'cafe'>('karintou');
  const [editWishLevel, setEditWishLevel] = useState(2);
  const [editIsPaidLeave, setEditIsPaidLeave] = useState(false);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newShiftType, setNewShiftType] = useState<'karintou' | 'cafe'>('karintou');
  const [newWishLevel, setNewWishLevel] = useState(2);
  const [newIsPaidLeave, setNewIsPaidLeave] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUser.id);
  const [shiftCondition, setShiftCondition] = useState<ShiftCondition | null>(null);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { getShiftCondition, employees: contextEmployees, addAvailability, approveAvailability } = useData();
  const isManager = currentUser.role === 'manager' || currentUser.isManager === true;
  const latestCurrentUser = contextEmployees.find(e => e.id === currentUser.id) ?? currentUser;

  const deptEmployees = contextEmployees
    .filter(e => e.departmentId === currentUser.departmentId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const selectedEmployee = deptEmployees.find(e => e.id === selectedEmployeeId) ?? latestCurrentUser;

  useEffect(() => {
    getShiftCondition(year, currentUser.departmentId).then(setShiftCondition);
  }, [year, getShiftCondition]);

  useEffect(() => {
    if (expandedDay === null) return;
    const container = listContainerRef.current;
    const el = dayRefs.current.get(expandedDay);
    if (!container || !el) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    container.scrollBy({ top: elTop - containerTop, behavior: 'smooth' });
  }, [expandedDay]);

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

  // ========== 一括処理 ==========
  const handleBulkInput = async () => {
    if (!selectedEmployee.defaultDays || selectedEmployee.defaultDays.length === 0) {
      alert('デフォルト用曜日が設定されていません\nテンプレート設定から曜日を設定してください');
      return;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    const targetDates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dow = String(date.getDay());
      if (!selectedEmployee.defaultDays.includes(dow)) continue;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const exists = availabilities.some(a => {
        const d = new Date(a.date);
        return a.employeeId === selectedEmployee.id &&
          d.getFullYear() === year &&
          d.getMonth() + 1 === month &&
          d.getDate() === day;
      });
      if (exists) continue;
      targetDates.push(dateStr);
    }
    if (targetDates.length === 0) {
      alert('対象日が見つかりませんでした\n（既に全日登録済み、または該当曜日なし）');
      return;
    }
    if (!window.confirm(`${selectedEmployee.name} の ${month}月 に ${targetDates.length} 件のシフトを一括入力しますか？`)) return;
    try {
      for (const dateStr of targetDates) {
        await addAvailability({
          employeeId: selectedEmployee.id,
          date: dateStr,
          startTime: selectedEmployee.defaultStartTime || '08:00',
          endTime: selectedEmployee.defaultEndTime || '17:00',
          shiftType: selectedEmployee.defaultShiftType || 'karintou',
          wishLevel: selectedEmployee.defaultWishLevel ?? 2,
        });
      }
    } catch { alert('一括入力に失敗しました'); }
  };

  const handleBulkApprove = async () => {
    const pendingItems = availabilities.filter(a => {
      if (a.employeeId !== selectedEmployee.id || a.status !== 'pending') return false;
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    if (pendingItems.length === 0) {
      alert(`${selectedEmployee.name} の ${month}月 に承認待ちシフトはありません`);
      return;
    }
    if (!window.confirm(`${selectedEmployee.name} の ${month}月 承認待ち ${pendingItems.length} 件を一括承認しますか？`)) return;
    try {
      for (const item of pendingItems) {
        await approveAvailability(item.id, currentUser.name);
      }
    } catch { alert('一括承認に失敗しました'); }
  };

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

  const getShiftsForDate = (date: Date) =>
    availabilities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate();
    });

  const getEmployee = (id: string) =>
    id === currentUser.id ? currentUser : employees.find(e => e.id === id);

  // ①有休申請は承認済みカウントから除外
  const getApprovedCount = (date: Date) =>
    getShiftsForDate(date).filter(a => a.status === 'approved' && !a.isPaidLeave).length;

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
      wishLevel: newWishLevel,
      isPaidLeave: newIsPaidLeave,
    });
    setAddingDay(null);
    setNewStartTime(latestCurrentUser.defaultStartTime || '08:00');
    setNewEndTime(latestCurrentUser.defaultEndTime || '17:00');
    setNewShiftType(latestCurrentUser.defaultShiftType || 'karintou');
    setNewWishLevel(latestCurrentUser.defaultWishLevel ?? 2);
    setNewIsPaidLeave(false);
    setSelectedEmployeeId(currentUser.id);
  };

  // 希望レベル+有休申請 1行レイアウト（PC版デザインのスマホ縮小版）
  const WishAndLeaveRow = ({
    wishLevel, onWishLevel,
    isPaidLeave, onPaidLeave,
  }: {
    wishLevel: number;
    onWishLevel: (l: number) => void;
    isPaidLeave: boolean;
    onPaidLeave: () => void;
  }) => (
    <div className="flex justify-center">
      <div className="flex items-stretch gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">希望レベル</label>
          <div className="flex gap-1">
            {[3, 2, 1].map(level => {
              const cfg = wishLevelConfig[level];
              const isSelected = wishLevel === level;
              return (
                <button key={level} type="button" onClick={() => onWishLevel(level)}
                  className={`w-[62px] flex-shrink-0 py-1.5 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${
                    isSelected ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}` : 'bg-white text-gray-400 border-gray-200'
                  }`}>
                  <div className="text-sm leading-none">{cfg.badge}</div>
                  <div className="text-[10px]">{cfg.label}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="w-px bg-gray-200 flex-shrink-0" />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">有休申請</label>
          <button type="button" onClick={onPaidLeave}
            className={`flex-1 flex items-center justify-center gap-1 px-2 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
              isPaidLeave
                ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                : 'border-dashed border-red-400 text-red-400 bg-white'
            }`}>
            <Leaf className="w-3 h-3 flex-shrink-0" />
            <span className="whitespace-nowrap">有休</span>
          </button>
        </div>
      </div>
    </div>
  );

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 h-9 flex items-center gap-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
            シフト管理システム
          </span>
          <span className="text-gray-500" style={{ fontSize: '0.7em' }}>Ver. 7.2</span>
          {departmentName && (
            <span className="text-xs font-bold text-indigo-700 ml-1">｜ {departmentName}</span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentUser.color }} />
            <span className="font-semibold text-gray-800 text-sm">{currentUser.name}</span>
            <span className="text-xs font-bold bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              シフト入力
            </span>
          </div>
          <button onClick={onBack} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 active:bg-indigo-100">
            メニュー
          </button>
        </div>
      </div>

      {/* コントロール行 */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
        {isManager ? (
          <>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-indigo-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
            >
              {deptEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.id === currentUser.id ? '（自分）' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkInput}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 active:scale-95 transition-all whitespace-nowrap flex-shrink-0"
            >
              <Zap className="w-3 h-3" />一括入力
            </button>
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-400 bg-gradient-to-r from-slate-300 to-gray-100 text-slate-600 active:scale-95 transition-all whitespace-nowrap flex-shrink-0"
            >
              <CheckCheck className="w-3 h-3" />一括承認
            </button>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <button
              onClick={handleBulkInput}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 active:scale-95 transition-all whitespace-nowrap flex-shrink-0"
            >
              <Zap className="w-3 h-3" />一括入力
            </button>
          </>
        )}
      </div>

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

      {/* 凡例（横スクロール） */}
      <div className="overflow-x-auto bg-white border-b border-gray-100 flex-shrink-0 scrollbar-hide">
        <div className="flex items-center gap-2 px-4 py-2 w-max">
          <span className="text-xs text-gray-400 whitespace-nowrap">種別</span>
          <span className="text-xs px-2 py-0.5 rounded font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: shiftTypeConfig.karintou.color }}>
            ◉ {shiftTypeConfig.karintou.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: shiftTypeConfig.cafe.color }}>
            ◆ {shiftTypeConfig.cafe.label}
          </span>

          <span className="text-gray-200 text-sm">｜</span>

          <span className="text-xs text-gray-400 whitespace-nowrap">日付</span>
          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold whitespace-nowrap">休日</span>
          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold whitespace-nowrap">セール</span>

          <span className="text-gray-200 text-sm">｜</span>

          <span className="text-xs text-gray-400 whitespace-nowrap">希望</span>
          {[3, 2, 1].map(level => {
            const cfg = wishLevelConfig[level];
            return (
              <span key={level} className={`text-xs px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                {cfg.badge} {cfg.label}
              </span>
            );
          })}

          <span className="text-gray-200 text-sm">｜</span>

          <span className="text-xs text-gray-400 whitespace-nowrap">状態</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white whitespace-nowrap"
            style={{ backgroundColor: shiftTypeConfig.karintou.color }}>
            ◉ 承認済 ✓
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border-2 bg-white whitespace-nowrap"
            style={{ borderColor: shiftTypeConfig.karintou.color, color: shiftTypeConfig.karintou.color }}>
            ◉ 承認待 …
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-300 bg-white text-gray-400 line-through whitespace-nowrap">
            ◉ 却下
          </span>

          <span className="text-gray-200 text-sm">｜</span>

          <span className="text-xs text-gray-400 whitespace-nowrap">操作</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-600 whitespace-nowrap">
            <Edit className="w-3 h-3" /> 編集
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 whitespace-nowrap">
            <Trash2 className="w-3 h-3" /> 削除
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-green-600 text-white whitespace-nowrap">
            <Check className="w-3 h-3" /> 承認
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-600 text-white whitespace-nowrap">
            <XCircle className="w-3 h-3" /> 却下
          </span>
        </div>
      </div>

      {/* 日付リスト */}
      <div ref={listContainerRef} className="flex-1 overflow-y-auto bg-gray-50 py-2 px-3 space-y-2">
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
              ref={el => { if (el) dayRefs.current.set(day, el); else dayRefs.current.delete(day); }}
              className={`rounded-2xl shadow-sm overflow-hidden border ${getDayBgClass(date)}`}
            >
              {/* 日付ヘッダー行 */}
              <button
                onClick={() => {
                  setExpandedDay(isExpanded ? null : day);
                  setAddingDay(null);
                  setEditingId(null);
                }}
                className={`w-full flex flex-col px-4 py-3 ${getDayHeaderBgClass(date)} active:opacity-80`}
              >
                <div className="flex items-center justify-between w-full">
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
                </div>

                {/* 自分のシフトバッジ */}
                {myShifts.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {myShifts.map(a => {
                      const cfg = shiftTypeConfig[a.shiftType];
                      const icon = a.shiftType === 'karintou' ? '◉' : '◆';
                      if (a.status === 'approved') {
                        return (
                          <span key={a.id} className="inline-flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: cfg.color }}>
                              {icon} {a.startTime}〜{a.endTime} ✓
                            </span>
                            {a.isPaidLeave && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-300">
                                <Leaf className="w-2.5 h-2.5 flex-shrink-0" />有休
                              </span>
                            )}
                          </span>
                        );
                      }
                      if (a.status === 'pending') {
                        return (
                          <span key={a.id} className="inline-flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border-2 bg-white"
                              style={{ borderColor: cfg.color, color: cfg.color }}>
                              {icon} {a.startTime}〜{a.endTime} …
                            </span>
                            {a.isPaidLeave && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-300">
                                <Leaf className="w-2.5 h-2.5 flex-shrink-0" />有休
                              </span>
                            )}
                          </span>
                        );
                      }
                      return (
                        <span key={a.id} className="inline-flex items-center gap-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-300 bg-white text-gray-400 line-through">
                            {icon} {a.startTime}〜{a.endTime}
                          </span>
                          {a.isPaidLeave && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-300">
                              <Leaf className="w-2.5 h-2.5 flex-shrink-0" />有休
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>

              {/* 展開パネル */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-2 space-y-2">

                  {/* 自分のシフト一覧 */}
                  {myShifts.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-indigo-600 px-1">自分のシフト</p>
                      {myShifts.map(a => {
                        const emp = getEmployee(a.employeeId);
                        const canEdit = isManager || (a.status === 'pending' && a.employeeId === currentUser.id);
                        // ⑤isManager特権削除：本人かつ承認済み以外のみ削除可
                        const canDelete = a.employeeId === currentUser.id && a.status !== 'approved';
                        const isEditing = editingId === a.id;
                        return (
                          <div key={a.id} className="rounded-xl border overflow-hidden">
                            <div className="px-3 py-1 flex items-center gap-2" style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}>
                              <span className="text-white text-xs font-bold">
                                {a.shiftType === 'karintou' ? '◉' : '◆'} {shiftTypeConfig[a.shiftType].label}
                              </span>
                            </div>
                            <div className={`px-3 py-2 ${statusConfig[a.status].cls}`}>
                              {isEditing ? (
                                <div className="space-y-2">
                                  {emp && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg">
                                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                                      <span className="text-xs font-semibold text-indigo-700">{emp.name}</span>
                                      <span className="text-xs text-indigo-400">を編集中</span>
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2 justify-center">
                                      <div className="flex flex-col items-start gap-0.5">
                                        <label className="block text-xs text-gray-500 mb-1">勤務開始時間</label>
                                        <TimeSelect value={editStartTime} onChange={setEditStartTime} className="w-32 text-base" />
                                      </div>
                                      <span className="text-gray-400 mt-4">〜</span>
                                      <div className="flex flex-col items-start gap-0.5">
                                        <label className="block text-xs text-gray-500 mb-1">勤務終了時間</label>
                                        <TimeSelect value={editEndTime} onChange={setEditEndTime} className="w-32 text-base" />
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">シフトタイプ</label>
                                    <div className="flex gap-2">
                                      {Object.entries(shiftTypeConfig).map(([key, val]) => (
                                        <button key={key} type="button" onClick={() => setEditShiftType(key as 'karintou' | 'cafe')}
                                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${editShiftType === key ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
                                          style={editShiftType === key ? { backgroundColor: val.color } : {}}>
                                          {key === 'karintou' ? '◉' : '◆'} {val.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* ⑧希望レベル＋有休申請 1行配置 */}
                                  <WishAndLeaveRow
                                    wishLevel={editWishLevel}
                                    onWishLevel={setEditWishLevel}
                                    isPaidLeave={editIsPaidLeave}
                                    onPaidLeave={() => setEditIsPaidLeave(v => !v)}
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => { onEditAvailability(a.id, editStartTime, editEndTime, editShiftType, editWishLevel, editIsPaidLeave); setEditingId(null); }}
                                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm flex items-center justify-center gap-1 active:scale-95">
                                      <Save className="w-3 h-3" /> 保存
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm active:scale-95">キャンセル</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {emp && (
                                    <div className="flex items-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                                      <span className="text-xs font-semibold text-gray-700">{emp.name}</span>
                                    </div>
                                  )}
                                  {/* 1行目：時間・承認状態・希望レベル・有休バッジ */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-medium whitespace-nowrap">{a.startTime}〜{a.endTime}</span>
                                    <span className="text-xs whitespace-nowrap">{statusConfig[a.status].label}</span>
                                    {(() => {
                                      const wcfg = wishLevelConfig[a.wishLevel ?? 2];
                                      return <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${wcfg.bgColor} ${wcfg.textColor} ${wcfg.borderColor}`}>{wcfg.badge}</span>;
                                    })()}
                                    {a.isPaidLeave && (
                                      <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md border bg-pink-100 text-pink-700 border-pink-300 whitespace-nowrap">
                                        <Leaf className="w-3 h-3 flex-shrink-0" />有休
                                      </span>
                                    )}
                                  </div>
                                  {/* 2行目：操作ボタン */}
                                  {(isManager || canEdit || canDelete) && (
                                    <div className="flex justify-end gap-1">
                                      {isManager && a.status === 'pending' && (
                                        <>
                                          <button onClick={() => onApprove(a.id)} className="p-1.5 bg-green-600 rounded-lg active:scale-95" title="承認"><Check className="w-3.5 h-3.5 text-white" /></button>
                                          <button onClick={() => onReject(a.id)} className="p-1.5 bg-red-600 rounded-lg active:scale-95" title="却下"><XCircle className="w-3.5 h-3.5 text-white" /></button>
                                        </>
                                      )}
                                      {isManager && a.status === 'approved' && (
                                        <button onClick={() => onReject(a.id)} className="p-1.5 bg-red-100 rounded-lg active:scale-95" title="却下に変更"><XCircle className="w-3.5 h-3.5 text-red-600" /></button>
                                      )}
                                      {canEdit && (
                                        <button onClick={() => { setEditingId(a.id); setEditStartTime(a.startTime); setEditEndTime(a.endTime); setEditShiftType(a.shiftType); setEditWishLevel(a.wishLevel ?? 2); setEditIsPaidLeave(a.isPaidLeave ?? false); }}
                                          className="p-1.5 bg-blue-100 rounded-lg active:scale-95" title="編集"><Edit className="w-3.5 h-3.5 text-blue-600" /></button>
                                      )}
                                      {canDelete && (
                                        <button onClick={() => onRemoveAvailability(a.id)} className="p-1.5 bg-red-100 rounded-lg active:scale-95" title="削除"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* シフト追加ボタン/フォーム */}
                  {isAdding ? (
                    <div className="bg-white rounded-xl border border-indigo-200 p-3 space-y-3">
                      <p className="text-xs font-semibold text-indigo-700">シフトを追加</p>
                      {isManager && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">対象スタッフ</label>
                          <select
                            value={selectedEmployeeId}
                            onChange={e => {
                              const empId = e.target.value;
                              setSelectedEmployeeId(empId);
                              const selEmp = empId === currentUser.id
                                ? latestCurrentUser
                                : (contextEmployees.find(emp => emp.id === empId) ?? employees.find(emp => emp.id === empId));
                              if (selEmp) {
                                setNewStartTime(selEmp.defaultStartTime || '08:00');
                                setNewEndTime(selEmp.defaultEndTime || '17:00');
                                setNewShiftType(selEmp.defaultShiftType || 'karintou');
                                setNewWishLevel(selEmp.defaultWishLevel ?? 2);
                              }
                            }}
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
                      <div>
                        <div className="flex items-center gap-2 justify-center">
                          <div className="flex flex-col items-start gap-0.5">
                            <label className="block text-xs text-gray-500 mb-1">勤務開始時間</label>
                            <TimeSelect value={newStartTime} onChange={setNewStartTime} className="w-32 text-base" />
                          </div>
                          <span className="text-gray-400 mt-4">〜</span>
                          <div className="flex flex-col items-start gap-0.5">
                            <label className="block text-xs text-gray-500 mb-1">勤務終了時間</label>
                            <TimeSelect value={newEndTime} onChange={setNewEndTime} className="w-32 text-base" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">シフトタイプ</label>
                        <div className="flex gap-2">
                          {Object.entries(shiftTypeConfig).map(([key, val]) => (
                            <button key={key} type="button" onClick={() => setNewShiftType(key as 'karintou' | 'cafe')}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${newShiftType === key ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
                              style={newShiftType === key ? { backgroundColor: val.color } : {}}>
                              {key === 'karintou' ? '◉' : '◆'} {val.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* ⑧希望レベル＋有休申請 1行配置 */}
                      <WishAndLeaveRow
                        wishLevel={newWishLevel}
                        onWishLevel={setNewWishLevel}
                        isPaidLeave={newIsPaidLeave}
                        onPaidLeave={() => setNewIsPaidLeave(v => !v)}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleAdd(day)}
                          className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold active:scale-95">
                          追加する
                        </button>
                        <button onClick={() => setAddingDay(null)}
                          className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm active:scale-95">
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingDay(day);
                        setSelectedEmployeeId(currentUser.id);
                        setNewStartTime(latestCurrentUser.defaultStartTime || '08:00');
                        setNewEndTime(latestCurrentUser.defaultEndTime || '17:00');
                        setNewShiftType(latestCurrentUser.defaultShiftType || 'karintou');
                        setNewWishLevel(latestCurrentUser.defaultWishLevel ?? 2);
                        setNewIsPaidLeave(false);
                      }}
                      className="w-full py-2.5 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 text-sm font-medium flex items-center justify-center gap-1 active:bg-indigo-50"
                    >
                      <Plus className="w-4 h-4" />
                      {isManager ? 'シフトを追加' : '自分のシフトを追加'}
                    </button>
                  )}

                  {/* 他スタッフのシフト一覧 */}
                  {shifts.filter(a => a.employeeId !== currentUser.id).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-400 px-1">他のスタッフ</p>
                      {shifts.filter(a => a.employeeId !== currentUser.id).map(a => {
                        const emp = getEmployee(a.employeeId);
                        const canEdit = isManager;
                        // ⑤isManager特権削除
                        const canDelete = a.employeeId === currentUser.id && a.status !== 'approved';
                        const isEditing = editingId === a.id;
                        return (
                          <div key={a.id} className="rounded-xl border overflow-hidden">
                            <div className="px-3 py-1 flex items-center gap-2" style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}>
                              <span className="text-white text-xs font-bold">
                                {a.shiftType === 'karintou' ? '◉' : '◆'} {shiftTypeConfig[a.shiftType].label}
                              </span>
                            </div>
                            <div className={`px-3 py-2 ${statusConfig[a.status].cls}`}>
                              {isEditing ? (
                                <div className="space-y-2">
                                  {emp && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg">
                                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                                      <span className="text-xs font-semibold text-indigo-700">{emp.name}</span>
                                      <span className="text-xs text-indigo-400">を編集中</span>
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2 justify-center">
                                      <div className="flex flex-col items-start gap-0.5">
                                        <label className="block text-xs text-gray-500 mb-1">勤務開始時間</label>
                                        <TimeSelect value={editStartTime} onChange={setEditStartTime} className="w-32 text-base" />
                                      </div>
                                      <span className="text-gray-400 mt-4">〜</span>
                                      <div className="flex flex-col items-start gap-0.5">
                                        <label className="block text-xs text-gray-500 mb-1">勤務終了時間</label>
                                        <TimeSelect value={editEndTime} onChange={setEditEndTime} className="w-32 text-base" />
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">シフトタイプ</label>
                                    <div className="flex gap-2">
                                      {Object.entries(shiftTypeConfig).map(([key, val]) => (
                                        <button key={key} type="button" onClick={() => setEditShiftType(key as 'karintou' | 'cafe')}
                                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${editShiftType === key ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
                                          style={editShiftType === key ? { backgroundColor: val.color } : {}}>
                                          {key === 'karintou' ? '◉' : '◆'} {val.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* ⑧希望レベル＋有休申請 1行配置 */}
                                  <WishAndLeaveRow
                                    wishLevel={editWishLevel}
                                    onWishLevel={setEditWishLevel}
                                    isPaidLeave={editIsPaidLeave}
                                    onPaidLeave={() => setEditIsPaidLeave(v => !v)}
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => { onEditAvailability(a.id, editStartTime, editEndTime, editShiftType, editWishLevel, editIsPaidLeave); setEditingId(null); }}
                                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm flex items-center justify-center gap-1 active:scale-95">
                                      <Save className="w-3 h-3" /> 保存
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm active:scale-95">キャンセル</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {emp && (
                                    <div className="flex items-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                                      <span className="text-xs font-semibold text-gray-700">{emp.name}</span>
                                    </div>
                                  )}
                                  {/* 1行目：時間・承認状態・希望レベル・有休バッジ */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-medium whitespace-nowrap">{a.startTime}〜{a.endTime}</span>
                                    <span className="text-xs whitespace-nowrap">{statusConfig[a.status].label}</span>
                                    {(() => {
                                      const wcfg = wishLevelConfig[a.wishLevel ?? 2];
                                      return <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${wcfg.bgColor} ${wcfg.textColor} ${wcfg.borderColor}`}>{wcfg.badge}</span>;
                                    })()}
                                    {a.isPaidLeave && (
                                      <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md border bg-pink-100 text-pink-700 border-pink-300 whitespace-nowrap">
                                        <Leaf className="w-3 h-3 flex-shrink-0" />有休
                                      </span>
                                    )}
                                  </div>
                                  {/* 2行目：操作ボタン */}
                                  {(isManager || canEdit || canDelete) && (
                                    <div className="flex justify-end gap-1">
                                      {isManager && a.status === 'pending' && (
                                        <>
                                          <button onClick={() => onApprove(a.id)} className="p-1.5 bg-green-600 rounded-lg active:scale-95" title="承認"><Check className="w-3.5 h-3.5 text-white" /></button>
                                          <button onClick={() => onReject(a.id)} className="p-1.5 bg-red-600 rounded-lg active:scale-95" title="却下"><XCircle className="w-3.5 h-3.5 text-white" /></button>
                                        </>
                                      )}
                                      {isManager && a.status === 'approved' && (
                                        <button onClick={() => onReject(a.id)} className="p-1.5 bg-red-100 rounded-lg active:scale-95" title="却下に変更"><XCircle className="w-3.5 h-3.5 text-red-600" /></button>
                                      )}
                                      {canEdit && (
                                        <button onClick={() => { setEditingId(a.id); setEditStartTime(a.startTime); setEditEndTime(a.endTime); setEditShiftType(a.shiftType); setEditWishLevel(a.wishLevel ?? 2); setEditIsPaidLeave(a.isPaidLeave ?? false); }}
                                          className="p-1.5 bg-blue-100 rounded-lg active:scale-95" title="編集"><Edit className="w-3.5 h-3.5 text-blue-600" /></button>
                                      )}
                                      {canDelete && (
                                        <button onClick={() => onRemoveAvailability(a.id)} className="p-1.5 bg-red-100 rounded-lg active:scale-95" title="削除"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {shifts.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-1">シフトなし</p>
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
