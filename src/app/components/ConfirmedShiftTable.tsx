import { format, isSameDay, getDaysInMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FileCheck, Printer } from 'lucide-react';
import { Employee, Availability, shiftTypeConfig, ShiftCondition } from '../types';
import { useState } from 'react';

interface ConfirmedShiftTableProps {
  year: number;
  month: number;
  half: 'first' | 'second';
  employees: Employee[];
  availabilities: Availability[];
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
  onYearChange,
  onMonthChange,
  onHalfChange,
}: ConfirmedShiftTableProps) {
  const [printHalf, setPrintHalf] = useState<'first' | 'second' | null>(null);

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

  const handlePrint = (half: 'first' | 'second') => {
    setPrintHalf(half);
    setTimeout(() => {
      window.print();
      setPrintHalf(null);
    }, 100);
  };

  // 印刷用の日付範囲を取得
  const getPrintDays = () => {
    if (!printHalf) return [];
    
    const startDay = printHalf === 'first' ? 1 : 16;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const endDay = printHalf === 'first' ? 15 : daysInMonth;
    
    const days: Date[] = [];
    for (let day = startDay; day <= endDay; day++) {
      days.push(new Date(year, month - 1, day));
    }
    return days;
  };

  const printDays = getPrintDays();

  // 印刷対象の全日付で最大シフト数を計算
  const getMaxShiftsPerDay = () => {
    if (!printHalf || printDays.length === 0) return 1;

    let maxShifts = 1;
    printDays.forEach((day) => {
      sortedEmployees.forEach((employee) => {
        const shifts = getConfirmedShiftsForEmployeeAndDate(employee.id, day);
        if (shifts.length > maxShifts) {
          maxShifts = shifts.length;
        }
      });
    });
    return maxShifts;
  };

  const maxShifts = getMaxShiftsPerDay();

  // シフト数に応じたフォントサイズを決定
  const getShiftFontSize = () => {
    if (maxShifts === 1) return '8pt';
    if (maxShifts === 2) return '6.5pt';
    if (maxShifts === 3) return '5.5pt';
    if (maxShifts === 4) return '4.8pt';
    return '4.2pt'; // 5つ以上
  };

  const shiftFontSize = getShiftFontSize();

  // シフト条件設定から祝日データを取得
  const getHolidaysFromShiftCondition = (targetYear: number): string[] => {
    try {
      const item = localStorage.getItem(`shift_condition_${targetYear}`);
      if (!item) return [];
      const condition: ShiftCondition = JSON.parse(item);
      const holidayRow = condition.rows.find(row => row.type === 'holiday');
      return holidayRow ? holidayRow.dates : [];
    } catch (error) {
      console.error('Error loading holidays from shift condition:', error);
      return [];
    }
  };

  // 日本の祝日を判定（シフト条件設定から取得）
  const isHoliday = (date: Date): boolean => {
    const holidays = getHolidaysFromShiftCondition(date.getFullYear());
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    return holidays.includes(key);
  };

  // 曜日から要員数を取得
  const getRequiredStaffCount = (date: Date): number => {
    try {
      const item = localStorage.getItem(`shift_condition_${date.getFullYear()}`);
      if (!item) return 0;
      const condition: ShiftCondition = JSON.parse(item);

      // 祝日の場合
      if (isHoliday(date)) {
        const holidayRow = condition.rows.find(row => row.type === 'holiday');
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
      const row = condition.rows.find(r => r.type === dayType);
      return row ? row.requiredStaff : 0;
    } catch (error) {
      console.error('Error loading required staff count:', error);
      return 0;
    }
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
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-container, .print-container * {
            visibility: visible;
          }
          
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .no-print {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .screen-only {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-only {
            display: block !important;
            visibility: visible !important;
            page-break-inside: avoid !important;
          }
          
          .print-title {
            text-align: left;
            font-size: 14pt !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
            color: #1f2937 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            page-break-after: avoid !important;
          }
          
          .print-date-info {
            font-size: 9pt !important;
            font-weight: normal !important;
            color: #6b7280 !important;
            text-align: right;
          }
          
          .print-container {
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            backdrop-filter: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
          }
          
          .print-table-wrapper {
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
          }

          .print-table {
            width: 100%;
            table-layout: fixed;
            margin: 0;
            border-collapse: collapse;
            border: 2.5px solid #333 !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
          }

          .print-table th,
          .print-table td {
            border: 0.5px solid #999 !important;
            padding: 2px 1px !important;
            font-size: 10pt !important;
            line-height: 1.2 !important;
            page-break-inside: avoid !important;
          }

          .print-table th {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            color: white !important;
            font-weight: bold !important;
            padding: 4px 2px !important;
            border: 1px solid #047857 !important;
            height: 42px !important;
            max-height: 42px !important;
            overflow: hidden !important;
          }
          
          .print-table .date-column {
            width: 50px !important;
            min-width: 50px !important;
            max-width: 50px !important;
            border-right: 2px solid #666 !important;
            padding: 1px !important;
          }

          .print-table .employee-column {
            width: calc((100% - 50px) / 15) !important;
          }

          .print-table tbody tr {
            border-bottom: 0.5px solid #ccc !important;
            height: 32px !important;
            max-height: 32px !important;
            page-break-inside: avoid !important;
          }

          .print-table tbody tr:nth-child(even) {
            background-color: #f9f9f9 !important;
          }

          .print-table tbody tr:nth-child(odd) {
            background-color: #ffffff !important;
          }

          .print-table tbody td {
            background-color: transparent !important;
            height: 32px !important;
            max-height: 32px !important;
            overflow: hidden !important;
            vertical-align: middle !important;
          }
          
          .sunday-cell {
            background-color: #fee2e2 !important;
          }

          .saturday-cell {
            background-color: #fee2e2 !important;
          }

          .holiday-cell {
            background-color: #fecaca !important;
          }
          
          .print-shift-time {
            font-size: ${shiftFontSize} !important;
            padding: 2px 2px !important;
            line-height: 1.2 !important;
            font-weight: 700 !important;
            border-radius: 2px !important;
            margin: 0.5px 0 !important;
            display: block !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .print-shift-container {
            height: 32px !important;
            max-height: 32px !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            padding: 1px !important;
          }
          
          .shift-karintou {
            background-color: ${shiftTypeConfig.karintou.color} !important;
            color: white !important;
            border: 1px solid ${shiftTypeConfig.karintou.color} !important;
          }
          
          .shift-cafe {
            background-color: ${shiftTypeConfig.cafe.color} !important;
            color: white !important;
            border: 1px solid ${shiftTypeConfig.cafe.color} !important;
          }
          
          .shift-type-label {
            font-size: 5pt !important;
            font-weight: 600 !important;
            margin-bottom: 1px !important;
            padding: 1px 2px !important;
            border-radius: 2px !important;
            display: inline-block !important;
          }
          
          .print-no-shift {
            font-size: 11pt !important;
            color: #9ca3af !important;
            font-weight: normal !important;
            text-align: center !important;
          }
          
          .print-employee-name {
            font-size: 9pt !important;
            line-height: 1.3 !important;
            font-weight: bold !important;
          }

          .print-date-text {
            font-size: 8.5pt !important;
            line-height: 1.1 !important;
            font-weight: bold !important;
            white-space: nowrap !important;
          }

          .print-date-day {
            font-size: 7.5pt !important;
            line-height: 1.1 !important;
            font-weight: bold !important;
            color: #059669 !important;
            white-space: nowrap !important;
          }
          
          .sunday-date .print-date-text,
          .sunday-date .print-date-day {
            color: #dc2626 !important;
          }

          .saturday-date .print-date-text,
          .saturday-date .print-date-day {
            color: #dc2626 !important;
          }

          .holiday-date .print-date-text,
          .holiday-date .print-date-day {
            color: #dc2626 !important;
          }
        }
        
        .print-only {
          display: none;
        }
      `}</style>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl print-container flex flex-col">
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
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="p-2.5 border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 min-w-[60px]">日付</th>
                {sortedEmployees.map((employee) => (
                  <th
                    key={employee.id}
                    className="p-2.5 border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 min-w-[120px]"
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
                    <td className={`p-1.5 border border-emerald-100 ${isSpecialDay ? 'bg-red-50' : 'bg-white/60'} w-28`}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 印刷用テーブル（日付が縦） */}
        {printHalf && (
          <div className="overflow-x-auto rounded-xl print-only">
            {/* 印刷用タイトル・凡例・印刷日を1行に */}
            <div className="print-title">
              <div>{year}年{month}月{printHalf === 'first' ? '前半' : '後半'}シフト管理表</div>
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  fontSize: '8pt',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#6b7280' }}>凡例：</span>
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '3px',
                    padding: '2px 6px',
                    backgroundColor: shiftTypeConfig.karintou.color,
                    color: 'white',
                    borderRadius: '3px',
                    fontWeight: '600'
                  }}>
                    ◉ {shiftTypeConfig.karintou.label}
                  </div>
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '3px',
                    padding: '2px 6px',
                    backgroundColor: shiftTypeConfig.cafe.color,
                    color: 'white',
                    borderRadius: '3px',
                    fontWeight: '600'
                  }}>
                    ◆ {shiftTypeConfig.cafe.label}
                  </div>
                </div>
                <div className="print-date-info">
                  印刷日: {format(new Date(), 'yyyy年M月d日', { locale: ja })}
                </div>
              </div>
            </div>
            
            <table className="w-full border-collapse print-table">
              <thead>
                <tr>
                  <th className="date-column">日付</th>
                  {Array.from({ length: 15 }, (_, index) => {
                    const employee = sortedEmployees[index];
                    return (
                      <th
                        key={employee?.id || `empty-${index}`}
                        className="employee-column"
                      >
                        {employee ? (
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <div
                                className="w-2 h-2 rounded-full shadow-sm"
                                style={{ backgroundColor: employee.color }}
                              />
                            </div>
                            <div className="font-semibold text-gray-800 print-employee-name">{employee.name}</div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {printDays.map((day) => {
                  const isSundayDay = isSunday(day);
                  const isSaturdayDay = isSaturday(day);
                  const isHolidayDay = isHoliday(day);
                  const dateClassName = isSundayDay ? 'sunday-date' : isSaturdayDay ? 'saturday-date' : isHolidayDay ? 'holiday-date' : '';
                  const cellClassName = isSundayDay ? 'sunday-cell' : isSaturdayDay ? 'saturday-cell' : isHolidayDay ? 'holiday-cell' : '';
                  const requiredStaff = getRequiredStaffCount(day);
                  const approvedCount = getApprovedShiftsCountForDate(day);

                  return (
                    <tr key={day.toISOString()}>
                      <td className={`date-column ${cellClassName}`}>
                        <div className={`text-center ${dateClassName}`}>
                          <div className="font-semibold text-gray-800 print-date-text">{day.getDate()}日({format(day, 'E', { locale: ja })})</div>
                          <div className="text-emerald-600 print-date-day">
                            【{approvedCount}/{requiredStaff}】
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 15 }, (_, index) => {
                        const employee = sortedEmployees[index];
                        const confirmedShifts = employee ? getConfirmedShiftsForEmployeeAndDate(employee.id, day) : [];
                        return (
                          <td
                            key={`${day.toISOString()}-${employee?.id || `empty-${index}`}`}
                            className={`employee-column ${cellClassName}`}
                          >
                            <div className="print-shift-container">
                              {confirmedShifts.map((shift) => (
                                <div
                                  key={shift.id}
                                  className={`text-center print-shift-time shift-${shift.shiftType}`}
                                >
                                  {shift.shiftType === 'karintou' ? '◉' : '◆'} {shift.startTime}-{shift.endTime}
                                </div>
                              ))}
                              {confirmedShifts.length === 0 && (
                                <div className="text-center print-no-shift">×</div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 no-print">
          <p className="text-xs text-emerald-800">
            このシフト確認表には、管理者によって承認された勤務希望のみが表示されています。
          </p>
        </div>
      </div>
    </>
  );
}