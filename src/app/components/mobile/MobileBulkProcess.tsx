import { useState, useEffect, useRef } from 'react';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Zap, CheckCheck, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { Employee, ShiftCondition, shiftTypeConfig, wishLevelConfig } from '../../types';
import { useData } from '../../context/DataContext';

interface MobileBulkProcessProps {
  currentUser: Employee;
  departmentName: string;
  onBack: () => void;
}

export function MobileBulkProcess({ currentUser, departmentName, onBack }: MobileBulkProcessProps) {
  const { employees: contextEmployees, availabilities, addAvailability, approveAvailability, getShiftCondition } = useData();

  const isManager = currentUser.role === 'manager' || currentUser.isManager === true;
  const latestCurrentUser = contextEmployees.find(e => e.id === currentUser.id) ?? currentUser;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentUser.id);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [shiftCondition, setShiftCondition] = useState<ShiftCondition | null>(null);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  const prevMonth = () => {
    setExpandedDay(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    setExpandedDay(null);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // ========== シフト条件ロジック ==========
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

  const getEmployee = (id: string) => contextEmployees.find(e => e.id === id);

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

  const isSpecialDay = (date: Date) => isSunday(date) || isSaturday(date) || isHoliday(date);

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
      const exists = availabilities.some(a => a.employeeId === selectedEmployee.id && a.date === dateStr);
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

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 h-9 flex items-center gap-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
            シフト管理システム
          </span>
          <span className="text-gray-500" style={{ fontSize: '0.7em' }}>Ver. 5.0</span>
          {departmentName && (
            <span className="text-xs font-bold text-indigo-700 ml-1">｜ {departmentName}</span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentUser.color }} />
            <span className="font-semibold text-gray-800 text-sm">{currentUser.name}</span>
            <span className="text-xs font-bold bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              一括処理
            </span>
          </div>
          <button onClick={onBack} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 active:bg-indigo-100">
            メニュー
          </button>
        </div>
      </div>

      {/* 一括処理コントロール行 */}
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
              <Zap className="w-3 h-3" />
              一括入力
            </button>
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-400 bg-gradient-to-r from-slate-300 to-gray-100 text-slate-600 active:scale-95 transition-all whitespace-nowrap flex-shrink-0"
            >
              <CheckCheck className="w-3 h-3" />
              一括承認
            </button>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <button
              onClick={handleBulkInput}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 active:scale-95 transition-all whitespace-nowrap flex-shrink-0"
            >
              <Zap className="w-3 h-3" />
              一括入力
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

      {/* 日付リスト（閲覧のみ） */}
      <div ref={listContainerRef} className="flex-1 overflow-y-auto bg-gray-50 py-2 px-3 space-y-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const date = new Date(year, month - 1, day);
          const shifts = getShiftsForDate(date);
          const approvedCount = getApprovedCount(date);
          const required = getRequiredStaff(date);
          const isExpanded = expandedDay === day;
          const dayLabel = format(date, 'd日(E)', { locale: ja });
          const achieved = required > 0 && approvedCount >= required;
          const myShifts = shifts.filter(a => a.employeeId === selectedEmployee.id);

          return (
            <div
              key={day}
              ref={el => { if (el) dayRefs.current.set(day, el); else dayRefs.current.delete(day); }}
              className={`rounded-2xl shadow-sm overflow-hidden border ${getDayBgClass(date)}`}
            >
              {/* 日付ヘッダー行 */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day)}
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
                          <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: cfg.color }}>
                            {icon} {a.startTime}〜{a.endTime} ✓
                          </span>
                        );
                      }
                      if (a.status === 'pending') {
                        return (
                          <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border-2 bg-white"
                            style={{ borderColor: cfg.color, color: cfg.color }}>
                            {icon} {a.startTime}〜{a.endTime} …
                          </span>
                        );
                      }
                      return (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-300 bg-white text-gray-400 line-through">
                          {icon} {a.startTime}〜{a.endTime}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>

              {/* 展開パネル（閲覧のみ） */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-2 space-y-2">
                  {/* 選択中スタッフのシフト */}
                  {myShifts.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-indigo-600 px-1">{selectedEmployee.name}のシフト</p>
                      {myShifts.map(a => {
                        const emp = getEmployee(a.employeeId);
                        return (
                          <div key={a.id} className="rounded-xl border overflow-hidden">
                            <div className="px-3 py-1" style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}>
                              <span className="text-white text-xs font-bold">
                                {a.shiftType === 'karintou' ? '◉' : '◆'} {shiftTypeConfig[a.shiftType].label}
                              </span>
                            </div>
                            <div className={`px-3 py-2 ${statusConfig[a.status].cls}`}>
                              <div className="space-y-1">
                                {emp && (
                                  <div className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                                    <span className="text-xs font-semibold text-gray-700">{emp.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-medium">{a.startTime}〜{a.endTime}</span>
                                  <span className="text-xs">{statusConfig[a.status].label}</span>
                                  {(() => {
                                    const wcfg = wishLevelConfig[a.wishLevel ?? 2];
                                    return <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${wcfg.bgColor} ${wcfg.textColor} ${wcfg.borderColor}`}>{wcfg.badge}</span>;
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 他のスタッフのシフト */}
                  {shifts.filter(a => a.employeeId !== selectedEmployee.id).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-400 px-1">他のスタッフ</p>
                      {shifts.filter(a => a.employeeId !== selectedEmployee.id).map(a => {
                        const emp = getEmployee(a.employeeId);
                        return (
                          <div key={a.id} className="rounded-xl border overflow-hidden">
                            <div className="px-3 py-1" style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}>
                              <span className="text-white text-xs font-bold">
                                {a.shiftType === 'karintou' ? '◉' : '◆'} {shiftTypeConfig[a.shiftType].label}
                              </span>
                            </div>
                            <div className={`px-3 py-2 ${statusConfig[a.status].cls}`}>
                              <div className="space-y-1">
                                {emp && (
                                  <div className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                                    <span className="text-xs font-semibold text-gray-700">{emp.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-medium">{a.startTime}〜{a.endTime}</span>
                                  <span className="text-xs">{statusConfig[a.status].label}</span>
                                  {(() => {
                                    const wcfg = wishLevelConfig[a.wishLevel ?? 2];
                                    return <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${wcfg.bgColor} ${wcfg.textColor} ${wcfg.borderColor}`}>{wcfg.badge}</span>;
                                  })()}
                                </div>
                              </div>
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
