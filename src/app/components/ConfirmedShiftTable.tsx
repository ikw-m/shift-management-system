import { format, isSameDay, getDaysInMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FileCheck, Printer, ClipboardList } from 'lucide-react';
import { Employee, Availability, shiftTypeConfig, ShiftCondition } from '../types';
import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

interface ConfirmedShiftTableProps {
  year: number;
  month: number;
  half: 'first' | 'second';
  employees: Employee[];
  availabilities: Availability[];
  currentUser: Employee | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onHalfChange: (half: 'first' | 'second') => void;
}

export function ConfirmedShiftTable({
  year,
  month,
  half,
  employees,
  availabilities,
  currentUser,
  onYearChange,
  onMonthChange,
  onHalfChange,
}: ConfirmedShiftTableProps) {
  const { getDailyNote, saveDailyNote, getMonthlyProcedure, saveMonthlyProcedure, getShiftCondition } = useData();
  const [noteText, setNoteText] = useState('このシフト確認表には、管理者によって承認された勤務希望のみが表示されています。');
  const [dailyNotes, setDailyNotes] = useState<{ [key: string]: string }>({});
  const [shiftCondition, setShiftCondition] = useState<ShiftCondition | null>(null);

  const isManager = currentUser?.role === 'manager' || currentUser?.isManager || false;

  // シフト条件設定を読み込み
  useEffect(() => {
    const loadShiftCondition = async () => {
      const condition = await getShiftCondition(year);
      setShiftCondition(condition);
    };
    loadShiftCondition();
  }, [year, getShiftCondition]);

  // 月別業務手順を読み込み
  useEffect(() => {
    const loadMonthlyProcedure = async () => {
      try {
        const procedure = await getMonthlyProcedure(year, month);
        setNoteText(procedure || 'このシフト確認表には、管理者によって承認された勤務希望のみが表示されています。');
      } catch (error) {
        console.error('月別業務手順の読み込みに失敗しました:', error);
      }
    };
    loadMonthlyProcedure();
  }, [year, month, getMonthlyProcedure]);

  // 表示する日付範囲の備考を読み込み
  useEffect(() => {
    const loadDailyNotes = async () => {
      const days = getDisplayDays();
      const notes: { [key: string]: string } = {};
      for (const day of days) {
        try {
          const dateStr = format(day, 'yyyy-MM-dd');
          const note = await getDailyNote(dateStr);
          if (note) {
            notes[day.toISOString()] = note;
          }
        } catch (error) {
          console.error('日別備考の読み込みに失敗しました:', error);
        }
      }
      setDailyNotes(notes);
    };
    loadDailyNotes();
  }, [year, month, half, getDailyNote]);

  const handleNoteChange = async (date: Date, value: string) => {
    if (!isManager) return;
    const key = date.toISOString();
    const dateStr = format(date, 'yyyy-MM-dd');
    setDailyNotes(prev => ({ ...prev, [key]: value }));

    try {
      await saveDailyNote(dateStr, value);
    } catch (error) {
      console.error('日別備考の保存に失敗しました:', error);
    }
  };

  const handleProcedureChange = async (value: string) => {
    setNoteText(value);

    try {
      await saveMonthlyProcedure(year, month, value);
    } catch (error) {
      console.error('月別業務手順の保存に失敗しました:', error);
    }
  };

  // 従業員をdisplayOrderでソート（最大15人まで表示）
  const sortedEmployees = [...employees].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).slice(0, 15);

  // 年のオプション（現在の年から前後2年）
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // 表示する日付範囲を取得（画面表示用）
  const getDisplayDays = () => {
    const startDay = half === 'first' ? 1 : 16;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const endDay = half === 'first' ? 15 : daysInMonth;

    const days: Date[] = [];
    for (let day = startDay; day <= endDay; day++) {
      days.push(new Date(year, month - 1, day));
    }
    return days;
  };

  const displayDays = getDisplayDays();

  // 特定日のすべての従業員の承認済みシフト数をカウント（1人につき1カウント）
  const getApprovedShiftsCountForDate = (date: Date): number => {
    let count = 0;
    employees.forEach((employee) => {
      const shifts = availabilities.filter(
        (availability) =>
          availability.employeeId === employee.id && isSameDay(availability.date, date)
      );
      if (shifts.length > 0) {
        count += 1; // 同一日に複数シフトがあっても1人としてカウント
      }
    });
    return count;
  };

  const getConfirmedShiftsForEmployeeAndDate = (employeeId: string, date: Date) => {
    return availabilities.filter(
      (availability) =>
        availability.employeeId === employeeId &&
        isSameDay(availability.date, date) &&
        availability.status === 'approved'
    );
  };

  const handlePrint = (targetHalf: 'first' | 'second') => {
    if (targetHalf !== half) {
      onHalfChange(targetHalf);
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

  // シフト条件設定から祝日データを取得
  const getHolidaysFromShiftCondition = (targetYear: number): string[] => {
    if (!shiftCondition || shiftCondition.year !== targetYear) return [];
    const holidayRow = shiftCondition.rows.find(row => row.type === 'holiday');
    return holidayRow ? holidayRow.dates : [];
  };

  // 日本の祝日を判定（シフト条件設定から取得）
  const isHoliday = (date: Date): boolean => {
    const holidays = getHolidaysFromShiftCondition(date.getFullYear());
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    return holidays.includes(key);
  };

  // 曜日から要員数を取得
  const getRequiredStaffCount = (date: Date): number => {
    if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return 0;

    const key = `${date.getMonth() + 1}/${date.getDate()}`;

    // セールイベントの場合（最優先）
    const springSaleRow = shiftCondition.rows.find(row => row.type === 'springSale');
    if (springSaleRow && springSaleRow.dates.includes(key)) {
      return springSaleRow.requiredStaff;
    }

    const summerSaleRow = shiftCondition.rows.find(row => row.type === 'summerSale');
    if (summerSaleRow && summerSaleRow.dates.includes(key)) {
      return summerSaleRow.requiredStaff;
    }

    const winterSaleRow = shiftCondition.rows.find(row => row.type === 'winterSale');
    if (winterSaleRow && winterSaleRow.dates.includes(key)) {
      return winterSaleRow.requiredStaff;
    }

    // 祝日の場合
    if (isHoliday(date)) {
      const holidayRow = shiftCondition.rows.find(row => row.type === 'holiday');
      return holidayRow ? holidayRow.requiredStaff : 0;
    }

    // 曜日から行タイプを取得
    const dayOfWeek = date.getDay(); // 0:日曜 1:月曜 ... 6:土曜
    const dayTypeMap: { [key: number]: string } = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

    const dayType = dayTypeMap[dayOfWeek];
    const row = shiftCondition.rows.find(r => r.type === dayType);
    return row ? row.requiredStaff : 0;
  };

  // 日曜日判定
  const isSunday = (date: Date): boolean => {
    return date.getDay() === 0;
  };

  // 土曜日判定
  const isSaturday = (date: Date): boolean => {
    return date.getDay() === 6;
  };

  return (
    <>
      <style>{`
        .confirmed-shift-fixed-column {
          left: -2px !important;
          padding-left: 4px;
        }
        .confirmed-shift-fixed-column-left::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #6ee7b7;
          z-index: 50;
        }
        .confirmed-shift-fixed-column-right::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #6ee7b7;
          z-index: 50;
        }
        .confirmed-shift-fixed-row-top::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: -1px;
          height: 3px;
          background-color: #6ee7b7;
          z-index: 50;
        }
        .confirmed-shift-fixed-row-bottom::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background-color: #6ee7b7;
          z-index: 50;
        }
        .confirmed-shift-corner-cell {
          left: -2px !important;
          top: -1px !important;
          padding: 11px 10px 10px 12px !important;
        }
        .confirmed-shift-corner-cell::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          border-top: 2px solid #6ee7b7;
          border-left: 2px solid #6ee7b7;
          z-index: 50;
          pointer-events: none;
        }
        .confirmed-shift-corner-cell::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          border-bottom: 2px solid #6ee7b7;
          border-right: 2px solid #6ee7b7;
          z-index: 50;
          pointer-events: none;
        }

        .confirmed-shift-notes-column {
          right: -2px !important;
          padding-right: 4px;
        }
        .confirmed-shift-notes-column-left::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #6ee7b7;
          z-index: 50;
        }
        .confirmed-shift-notes-column-right::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #6ee7b7;
          z-index: 50;
        }

        .confirmed-shift-notes-header-cell {
          right: -2px !important;
          top: -1px !important;
          padding: 11px 10px 10px 12px !important;
        }
        .confirmed-shift-notes-header-cell::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          border-top: 2px solid #6ee7b7;
          border-left: 2px solid #6ee7b7;
          z-index: 50;
          pointer-events: none;
        }
        .confirmed-shift-notes-header-cell::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          border-bottom: 2px solid #6ee7b7;
          border-right: 2px solid #6ee7b7;
          z-index: 50;
          pointer-events: none;
        }


        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .print-container, .print-container * {
            visibility: visible;
          }

          .print-container {
            position: static !important;
            display: block !important;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }

          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          .screen-only {
            display: none !important;
            visibility: hidden !important;
          }

          [class*="sticky"],
          [class*="fixed"] {
            position: static !important;
          }
        }
      `}</style>
      <div className="bg-white backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl print-container flex flex-col">
        {/* 表題部分 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 no-print">
          <div className="flex items-center gap-4">
            <h2 className="flex items-center gap-2 text-gray-800 text-base">
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg shadow-lg">
                <FileCheck className="w-4 h-4 text-white" />
              </div>
              シフト確認表
            </h2>
            {/* 凡例 */}
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-600 font-medium">凡例：</span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: shiftTypeConfig.karintou.color }}>
                <span className="text-[10px] font-semibold text-white">◉ {shiftTypeConfig.karintou.label}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: shiftTypeConfig.cafe.color }}>
                <span className="text-[10px] font-semibold text-white">◆ {shiftTypeConfig.cafe.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint('first')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">印刷（前半）</span>
            </button>
            <button
              onClick={() => handlePrint('second')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">印刷（後半）</span>
            </button>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="px-2.5 py-1.5 text-sm rounded-lg border border-emerald-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 transition-colors"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="px-2.5 py-1.5 text-sm rounded-lg border border-emerald-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 transition-colors"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
            <select
              value={half}
              onChange={(e) => onHalfChange(e.target.value as 'first' | 'second')}
              className="px-2.5 py-1.5 text-sm rounded-lg border border-emerald-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 transition-colors"
            >
              <option value="first">前半（1-15日）</option>
              <option value="second">後半（16-{getDaysInMonth(new Date(year, month - 1))}日）</option>
            </select>
          </div>
        </div>

        {/* 画面表示用テーブル（横に従業員、縦に日付） */}
        <div className="overflow-auto max-h-[calc(100vh-320px)] screen-only">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2.5 border border-emerald-100 bg-emerald-100 min-w-[60px] sticky z-20 relative confirmed-shift-corner-cell">日付</th>
                {sortedEmployees.map((employee) => (
                  <th
                    key={employee.id}
                    className="p-2.5 border border-emerald-100 bg-emerald-100 min-w-[120px] sticky top-0 z-10 confirmed-shift-fixed-row-top confirmed-shift-fixed-row-bottom"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full shadow-md"
                          style={{ backgroundColor: employee.color }}
                        />
                      </div>
                      <div className="font-semibold text-gray-800 text-sm">{employee.name}</div>
                    </div>
                  </th>
                ))}
                <th className="p-2.5 border border-emerald-100 bg-emerald-100 min-w-[120px] sticky z-20 relative confirmed-shift-notes-header-cell">
                  備考
                </th>
              </tr>
            </thead>
            <tbody>
              {displayDays.map((day) => {
                const isSundayDay = isSunday(day);
                const isSaturdayDay = isSaturday(day);
                const isHolidayDay = isHoliday(day);
                const isSpecialDay = isSundayDay || isSaturdayDay || isHolidayDay;
                const requiredStaff = getRequiredStaffCount(day);
                const approvedCount = getApprovedShiftsCountForDate(day);

                return (
                  <tr key={day.toISOString()} className="hover:bg-emerald-50/30 transition-colors">
                    <td className={`p-1.5 border border-emerald-100 ${isSpecialDay ? 'bg-red-100' : 'bg-white'} w-28 sticky left-0 z-10 relative confirmed-shift-fixed-column confirmed-shift-fixed-column-left confirmed-shift-fixed-column-right`}>
                      <div className="text-center">
                        <div className={`font-semibold text-xs leading-tight ${isSpecialDay ? 'text-red-600' : 'text-gray-800'}`}>
                          {day.getDate()}日({format(day, 'E', { locale: ja })})
                        </div>
                        <div className={`font-semibold text-xs leading-tight mt-0.5 ${isSpecialDay ? 'text-red-500' : 'text-emerald-600'}`}>
                          【{approvedCount}/{requiredStaff}】
                        </div>
                      </div>
                    </td>
                    {sortedEmployees.map((employee) => {
                      const confirmedShifts = getConfirmedShiftsForEmployeeAndDate(employee.id, day);
                      return (
                        <td
                          key={`${employee.id}-${day.toISOString()}`}
                          className={`p-1.5 border border-emerald-100 align-top ${isSpecialDay ? 'bg-red-50/30' : 'bg-white/40'}`}
                        >
                          <div className="space-y-1.5">
                            {confirmedShifts.map((shift) => (
                              <div
                                key={shift.id}
                                className="px-1.5 py-1.5 rounded-lg text-center shadow-sm hover:shadow-md transition-all duration-200"
                                style={{
                                  backgroundColor: shiftTypeConfig[shift.shiftType].color,
                                  color: 'white',
                                  border: `1px solid ${shiftTypeConfig[shift.shiftType].color}`
                                }}
                              >
                                <div className="font-semibold text-[10px]">
                                  {shift.shiftType === 'karintou' ? '◉' : '◆'} {shift.startTime} - {shift.endTime}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                    <td className={`p-1.5 border border-emerald-100 ${isSpecialDay ? 'bg-red-50' : 'bg-white'} sticky right-0 z-10 relative confirmed-shift-notes-column confirmed-shift-notes-column-left confirmed-shift-notes-column-right`}>
                      <textarea
                        value={dailyNotes[day.toISOString()] || ''}
                        onChange={(e) => handleNoteChange(day, e.target.value)}
                        disabled={!isManager}
                        className={`w-full px-1.5 py-1 text-xs bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded resize-none min-h-[60px] ${!isManager ? 'cursor-not-allowed opacity-60' : ''}`}
                        placeholder={isManager ? '' : ''}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


        <div className="p-3 border-t border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-green-50/50 no-print">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg shadow-md">
              <ClipboardList className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">業務手順</h3>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => handleProcedureChange(e.target.value)}
            disabled={!isManager}
            className={`w-full px-3 py-2 text-xs text-gray-700 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none shadow-sm transition-shadow ${isManager ? 'hover:shadow-md' : 'cursor-not-allowed opacity-60'}`}
            rows={2}
            placeholder={isManager ? '業務手順や備考を入力してください...' : ''}
          />
        </div>
      </div>
    </>
  );
}