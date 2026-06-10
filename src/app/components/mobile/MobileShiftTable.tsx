import { useState } from 'react';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Employee, Availability, shiftTypeConfig } from '../../types';

interface MobileShiftTableProps {
  employees: Employee[];
  availabilities: Availability[];
}

export function MobileShiftTable({ employees, availabilities }: MobileShiftTableProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));

  const getApprovedForDate = (date: Date) =>
    availabilities.filter(a => {
      const d = new Date(a.date);
      return a.status === 'approved' &&
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate();
    });

  const getAllForDate = (date: Date) =>
    availabilities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate();
    });

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const statusLabel = {
    pending: '承認待ち',
    approved: '承認済み',
    rejected: '却下',
  };
  const statusClass = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="flex flex-col h-full">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={prevMonth} className="p-2 rounded-xl bg-gray-100 active:bg-gray-200">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="font-bold text-gray-800 text-lg">{year}年 {month}月</span>
        <button onClick={nextMonth} className="p-2 rounded-xl bg-gray-100 active:bg-gray-200">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100">
        <span className="text-xs text-gray-500">凡例：</span>
        <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: shiftTypeConfig.karintou.color }}>
          ◉ {shiftTypeConfig.karintou.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: shiftTypeConfig.cafe.color }}>
          ◆ {shiftTypeConfig.cafe.label}
        </span>
      </div>

      {/* 日付リスト */}
      <div className="flex-1 overflow-y-auto bg-gray-50 py-2 px-3 space-y-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const date = new Date(year, month - 1, day);
          const isSun = isSunday(date);
          const isSat = isSaturday(date);
          const approved = getApprovedForDate(date);
          const all = getAllForDate(date);
          const isExpanded = expandedDay === day;

          const dayLabel = format(date, 'd日(E)', { locale: ja });
          const dateClass = isSun ? 'text-red-600' : isSat ? 'text-blue-600' : 'text-gray-800';

          return (
            <div key={day} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              {/* 日付ヘッダー行（タップで展開） */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-base ${dateClass}`}>{dayLabel}</span>
                  <span className="text-xs text-gray-500">承認済: {approved.length}件</span>
                  {all.filter(a => a.status === 'pending').length > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-300">
                      待ち: {all.filter(a => a.status === 'pending').length}件
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 承認済みシフトをミニバッジで表示 */}
                  <div className="flex gap-1">
                    {approved.slice(0, 3).map(a => (
                      <span
                        key={a.id}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}
                      />
                    ))}
                    {approved.length > 3 && (
                      <span className="text-xs text-gray-400">+{approved.length - 3}</span>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* 展開時の詳細 */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-3 pt-2">
                  {all.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2 text-center">シフトなし</p>
                  ) : (
                    <div className="space-y-2">
                      {all.map(a => {
                        const emp = getEmployee(a.employeeId);
                        return (
                          <div
                            key={a.id}
                            className={`flex items-center justify-between p-2 rounded-xl border text-sm ${statusClass[a.status]}`}
                          >
                            <div className="flex items-center gap-2">
                              {emp && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: emp.color }}
                                />
                              )}
                              <span className="font-medium">{emp?.name ?? '不明'}</span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-md font-semibold text-white"
                                style={{ backgroundColor: shiftTypeConfig[a.shiftType].color }}
                              >
                                {a.shiftType === 'karintou' ? '◉' : '◆'}
                              </span>
                              <span>{a.startTime}〜{a.endTime}</span>
                            </div>
                            <span className="text-xs">{statusLabel[a.status]}</span>
                          </div>
                        );
                      })}
                    </div>
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
