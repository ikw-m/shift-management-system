import { useState, useEffect } from 'react';
import { format, getDaysInMonth, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Printer, LogOut, Store } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ShiftCondition, shiftTypeConfig } from '../types';

interface ShiftPrintScreenProps {
  departmentId: string;
  departmentName: string;
  onClose: () => void;
}

export function ShiftPrintScreen({ departmentId, departmentName, onClose }: ShiftPrintScreenProps) {
  const { employees: allEmployees, availabilities, getShiftCondition, getDailyNotesForMonth, getMonthlyProcedure } = useData();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [printMode, setPrintMode] = useState<'first' | 'second' | 'both' | null>(null);
  const [shiftCondition, setShiftCondition] = useState<ShiftCondition | null>(null);
  const [dailyNotes, setDailyNotes] = useState<{ [key: string]: string }>({});
  const [noteText, setNoteText] = useState('このシフト確認表には、管理者によって承認された勤務希望のみが表示されています。');

  const currentYear = today.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const sortedEmployees = [...allEmployees]
    .filter(e => e.departmentId === departmentId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .slice(0, 15);

  useEffect(() => {
    getShiftCondition(year, departmentId).then(setShiftCondition);
  }, [year, departmentId, getShiftCondition]);

  useEffect(() => {
    getMonthlyProcedure(year, month, departmentId).then(p => setNoteText(p || 'このシフト確認表には、管理者によって承認された勤務希望のみが表示されています。'));
  }, [year, month, departmentId, getMonthlyProcedure]);

  useEffect(() => {
    getDailyNotesForMonth(year, month, departmentId).then(byDate => {
      const notes: { [key: string]: string } = {};
      Object.entries(byDate).forEach(([dateStr, note]) => {
        const date = new Date(dateStr + 'T00:00:00');
        notes[date.toISOString()] = note;
      });
      setDailyNotes(notes);
    });
  }, [year, month, departmentId, getDailyNotesForMonth]);

  const isHoliday = (date: Date): boolean => {
    if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return false;
    const holidayRow = shiftCondition.rows.find(r => r.type === 'holiday');
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    return !!(holidayRow && holidayRow.dates.includes(key));
  };

  const getRequiredStaffCount = (date: Date): number => {
    if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return 0;
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    for (const type of ['springSale', 'summerSale', 'winterSale'] as const) {
      const row = shiftCondition.rows.find(r => r.type === type);
      if (row && row.dates.includes(key)) return row.requiredStaff;
    }
    if (isHoliday(date)) {
      const row = shiftCondition.rows.find(r => r.type === 'holiday');
      return row ? row.requiredStaff : 0;
    }
    const dayTypeMap: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
    const row = shiftCondition.rows.find(r => r.type === dayTypeMap[date.getDay()]);
    return row ? row.requiredStaff : 0;
  };

  const getConfirmedShifts = (employeeId: string, date: Date) =>
    availabilities.filter(a => a.employeeId === employeeId && isSameDay(a.date, date) && a.status === 'approved');

  const getApprovedCount = (date: Date) =>
    sortedEmployees.filter(e => getConfirmedShifts(e.id, date).length > 0).length;

  const getDays = (half: 'first' | 'second') => {
    const startDay = half === 'first' ? 1 : 16;
    const endDay = half === 'first' ? 15 : getDaysInMonth(new Date(year, month - 1));
    const days: Date[] = [];
    for (let d = startDay; d <= endDay; d++) days.push(new Date(year, month - 1, d));
    return days;
  };

  // 印刷対象日の最大シフト数（ConfirmedShiftTableと同じロジック）
  const getPrintDays = (half: 'first' | 'second') => getDays(half);

  const getMaxShiftsPerDay = (printDays: Date[]) => {
    if (printDays.length === 0) return 1;
    let maxShifts = 1;
    printDays.forEach(day => {
      sortedEmployees.forEach(emp => {
        const shifts = getConfirmedShifts(emp.id, day);
        if (shifts.length > maxShifts) maxShifts = shifts.length;
      });
    });
    return maxShifts;
  };

  const getShiftFontSize = (maxShifts: number) => {
    if (maxShifts === 1) return '6.5pt';
    if (maxShifts === 2) return '5.5pt';
    if (maxShifts === 3) return '4.8pt';
    if (maxShifts === 4) return '4.2pt';
    return '3.8pt';
  };

  // 印刷モードに応じて使用するフォントサイズを決定
  const activePrintDays = printMode
    ? printMode === 'both'
      ? [...getDays('first'), ...getDays('second')]
      : printMode === 'first' ? getDays('first') : getDays('second')
    : [];
  const maxShifts = getMaxShiftsPerDay(activePrintDays);
  const shiftFontSize = getShiftFontSize(maxShifts);

  const handlePrint = (mode: 'first' | 'second' | 'both') => {
    setPrintMode(mode);
    setTimeout(() => { window.print(); setPrintMode(null); }, 100);
  };

  const renderPrintSection = (half: 'first' | 'second', isSecondSection = false) => {
    const printDays = getPrintDays(half);

    return Array.from({ length: Math.ceil(sortedEmployees.length / 12) }, (_, pageIndex) => {
      const pageEmployees = sortedEmployees.slice(pageIndex * 12, (pageIndex + 1) * 12);
      const needsBreak = pageIndex > 0 || isSecondSection;

      return (
        <div key={`${half}-${pageIndex}`} className={`print-page${needsBreak ? ' print-page-break' : ''}`}>
          {/* 印刷用タイトル・凡例・印刷日 */}
          <div className="print-title">
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {departmentName && <span style={{ color: '#4f46e5', marginRight: '8px' }}>{departmentName}</span>}
              {year}年{month}月{half === 'first' ? '前半' : '後半'}シフト管理表{' '}
              <span style={{ fontSize: '8pt', color: '#6b7280', fontWeight: 'normal' }}>[Ver. 3.3]</span>
              {sortedEmployees.length > 12 ? ` (${pageIndex + 1}/${Math.ceil(sortedEmployees.length / 12)})` : ''}
            </div>
            <div style={{ fontSize: '8pt', marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold', color: '#6b7280' }}>凡例：</span>
              <span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: shiftTypeConfig.karintou.color, color: 'white', borderRadius: '3px', fontWeight: '600', marginLeft: '4px', marginRight: '4px' }}>
                ◉ {shiftTypeConfig.karintou.label}
              </span>
              <span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: shiftTypeConfig.cafe.color, color: 'white', borderRadius: '3px', fontWeight: '600', marginRight: '4px' }}>
                ◆ {shiftTypeConfig.cafe.label}
              </span>
            </div>
            <div className="print-date-info" style={{ fontSize: '9pt', color: '#6b7280', textAlign: 'right' }}>
              印刷日: {format(new Date(), 'yyyy年M月d日', { locale: ja })}
            </div>
          </div>

          <table className="w-full border-collapse print-table">
            <thead>
              <tr>
                <th className="date-column">日付</th>
                {Array.from({ length: 12 }, (_, index) => {
                  const employee = pageEmployees[index];
                  return (
                    <th key={employee?.id || `empty-${pageIndex}-${index}`} className="employee-column">
                      {employee ? (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: employee.color }} />
                          </div>
                          <div className="font-semibold text-gray-800 print-employee-name">{employee.name}</div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-400">-</div>
                      )}
                    </th>
                  );
                })}
                <th className="notes-column">備考</th>
              </tr>
            </thead>
            <tbody>
              {printDays.map(day => {
                const isSundayDay = day.getDay() === 0;
                const isSaturdayDay = day.getDay() === 6;
                const isHolidayDay = isHoliday(day);
                const dateClassName = isSundayDay ? 'sunday-date' : isSaturdayDay ? 'saturday-date' : isHolidayDay ? 'holiday-date' : '';
                const cellClassName = isSundayDay ? 'sunday-cell' : isSaturdayDay ? 'saturday-cell' : isHolidayDay ? 'holiday-cell' : '';
                const requiredStaff = getRequiredStaffCount(day);
                const approvedCount = getApprovedCount(day);

                return (
                  <tr key={day.toISOString()}>
                    <td className={`date-column ${cellClassName}`}>
                      <div className={`text-center ${dateClassName}`}>
                        <div className="font-semibold text-gray-800 print-date-text">{day.getDate()}日({format(day, 'E', { locale: ja })})</div>
                        <div className="text-emerald-600 print-date-day">【{approvedCount}/{requiredStaff}】</div>
                      </div>
                    </td>
                    {Array.from({ length: 12 }, (_, index) => {
                      const employee = pageEmployees[index];
                      const confirmedShifts = employee ? getConfirmedShifts(employee.id, day) : [];
                      return (
                        <td key={`${day.toISOString()}-${employee?.id || `empty-${pageIndex}-${index}`}`} className={`employee-column ${cellClassName}`}>
                          <div className="print-shift-container">
                            {confirmedShifts.map(shift => (
                              <div key={shift.id} className={`print-shift-time shift-${shift.shiftType}`}>
                                <span className={`print-shift-icon-${shift.shiftType}`}>
                                  {shift.shiftType === 'karintou' ? '◉' : '◆'}
                                </span>
                                <span className={`print-shift-text-${shift.shiftType}`}>
                                  {shift.startTime}-{shift.endTime}
                                </span>
                              </div>
                            ))}
                            {confirmedShifts.length === 0 && employee && (
                              <div className="text-center print-no-shift">×</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className={`notes-column ${cellClassName}`}>
                      <div style={{ fontSize: '7pt', lineHeight: '1.3', wordWrap: 'break-word' }}>
                        {dailyNotes[day.toISOString()] || ''}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {noteText && (
            <div className="print-procedure-section">
              <div className="print-procedure-title">📋 業務手順</div>
              <div className="print-procedure-content">{noteText}</div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <style>{`
        .confirmed-shift-fixed-column {
          left: -2px !important;
          padding-left: 4px;
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

          .no-print {
            display: none !important;
          }

          .screen-only {
            display: none !important;
          }

          [class*="sticky"],
          [class*="fixed"] {
            position: static !important;
          }

          .print-only {
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-page {
            display: block !important;
            width: 100% !important;
            overflow: visible !important;
          }

          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
          }

          .print-title {
            text-align: left;
            font-size: 14pt !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
            color: #1f2937 !important;
            display: block !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
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
            display: block !important;
            page-break-inside: auto !important;
            page-break-before: avoid !important;
            break-inside: auto !important;
            break-before: avoid !important;
          }

          .print-table {
            width: 100% !important;
            table-layout: fixed !important;
            margin: 0 0 6px 0 !important;
            border-collapse: collapse !important;
            border: 2.5px solid #333 !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: auto !important;
            break-inside: avoid !important;
            break-before: avoid !important;
            break-after: auto !important;
            display: table !important;
          }

          .print-table th,
          .print-table td {
            display: table-cell !important;
            border: 0.5px solid #999 !important;
            padding: 1px 0.5px !important;
            font-size: 10pt !important;
            line-height: 1.2 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-table thead {
            display: table-header-group !important;
          }

          .print-table tbody {
            display: table-row-group !important;
          }

          .print-table th {
            display: table-cell !important;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: white !important;
            font-weight: bold !important;
            padding: 2px 1px !important;
            border: 1px solid #047857 !important;
            height: 38px !important;
            max-height: 38px !important;
            overflow: hidden !important;
          }

          .print-table .date-column {
            width: 50px !important;
            min-width: 50px !important;
            max-width: 50px !important;
            border-right: 2px solid #666 !important;
            padding: 0.5px !important;
          }

          .print-table .employee-column {
            width: calc((100% - 50px) / 14) !important;
          }

          .print-table .notes-column {
            width: calc((100% - 50px) / 14 * 2) !important;
            border-left: 2px solid #666 !important;
            font-size: 7pt !important;
            padding: 1px 2px !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.3 !important;
          }

          .print-table tbody tr {
            border-bottom: 0.5px solid #ccc !important;
            height: 30px !important;
            max-height: 30px !important;
            page-break-inside: avoid !important;
            page-break-after: auto !important;
            break-inside: avoid !important;
            break-after: auto !important;
            display: table-row !important;
          }

          .print-table tbody tr:nth-child(even) {
            background-color: #f9f9f9 !important;
          }

          .print-table tbody tr:nth-child(odd) {
            background-color: #ffffff !important;
          }

          .print-table tbody td {
            display: table-cell !important;
            background-color: transparent !important;
            height: 30px !important;
            max-height: 30px !important;
            overflow: hidden !important;
            vertical-align: middle !important;
          }

          .sunday-cell {
            background-color: #fee2e2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .saturday-cell {
            background-color: #fee2e2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .holiday-cell {
            background-color: #fecaca !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-shift-time {
            font-size: ${shiftFontSize} !important;
            padding: 0 !important;
            line-height: 1.1 !important;
            font-weight: 700 !important;
            border-radius: 1px !important;
            margin: 0.5px 0 !important;
            display: block !important;
            white-space: nowrap !important;
            overflow: visible !important;
            word-break: keep-all !important;
            border: 1px solid !important;
          }

          .print-shift-container {
            height: 30px !important;
            max-height: 30px !important;
            overflow: hidden !important;
            display: block !important;
            padding: 0.5px !important;
            text-align: left !important;
          }

          .print-shift-time.shift-karintou {
            border-color: #78350f !important;
          }

          .print-shift-time.shift-cafe {
            border-color: #FFC72C !important;
          }

          .print-no-shift {
            font-size: 11pt !important;
            color: #9ca3af !important;
            font-weight: normal !important;
            text-align: center !important;
          }

          .print-employee-name {
            font-size: 7pt !important;
            line-height: 1.2 !important;
            font-weight: bold !important;
          }

          .print-date-text {
            font-size: 7pt !important;
            line-height: 1.1 !important;
            font-weight: bold !important;
            white-space: nowrap !important;
            margin-bottom: 2px !important;
          }

          .print-date-day {
            font-size: 6pt !important;
            line-height: 1.1 !important;
            font-weight: bold !important;
            color: #059669 !important;
            white-space: nowrap !important;
            margin-top: 2px !important;
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

          .print-procedure-section {
            margin-top: 8px !important;
            padding: 6px 10px !important;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border: 1.5px solid #10b981 !important;
            border-radius: 6px !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid-page !important;
            break-before: avoid-page !important;
            break-after: avoid !important;
            display: block !important;
            max-height: 70px !important;
            overflow: hidden !important;
          }

          .print-procedure-title {
            font-size: 8pt !important;
            font-weight: bold !important;
            color: #047857 !important;
            margin-bottom: 4px !important;
            display: block !important;
          }

          .print-procedure-content {
            font-size: 7pt !important;
            line-height: 1.3 !important;
            color: #065f46 !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
          }

          span.print-shift-icon-karintou {
            padding: 1px 3px !important;
            display: inline-block !important;
            background: #78350f !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-radius: 1px 0 0 1px !important;
          }

          span.print-shift-text-karintou {
            padding: 1px 3px !important;
            display: inline-block !important;
            background: transparent !important;
            color: #78350f !important;
            border-radius: 0 1px 1px 0 !important;
          }

          span.print-shift-icon-cafe {
            padding: 1px 3px !important;
            display: inline-block !important;
            background: #FFC72C !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-radius: 1px 0 0 1px !important;
          }

          span.print-shift-text-cafe {
            padding: 1px 3px !important;
            display: inline-block !important;
            background: transparent !important;
            color: #FFC72C !important;
            border-radius: 0 1px 1px 0 !important;
          }

          @supports (-webkit-hyphens:none) {
            .print-table { display: table !important; width: 100% !important; }
            .print-table thead { display: table-header-group !important; }
            .print-table tbody { display: table-row-group !important; }
            .print-table tr { display: table-row !important; }
            .print-table th, .print-table td { display: table-cell !important; }
          }
        }

        .print-only {
          display: none;
        }
      `}</style>

      {/* ポップアップモーダル */}
      <div className="no-print fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-gray-800 text-sm">シフト管理表印刷</span>
                  <span className="text-xs text-gray-400">Ver. 3.3</span>
                </div>
                {departmentName && (
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-700 mt-0.5">
                    <Store className="w-3 h-3" />{departmentName}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="閉じる">
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* 年月選択 */}
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-indigo-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-indigo-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>

          {/* 印刷ボタン */}
          <div className="px-4 pb-4 flex flex-col gap-2 mt-2">
            <button onClick={() => handlePrint('first')}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all shadow-md">
              <Printer className="w-4 h-4" /> 印刷（前半）
            </button>
            <button onClick={() => handlePrint('second')}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all shadow-md">
              <Printer className="w-4 h-4" /> 印刷（後半）
            </button>
            <button onClick={() => handlePrint('both')}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all shadow-md">
              <Printer className="w-4 h-4" /> 印刷（１ヶ月）
            </button>
          </div>
        </div>
      </div>

      {/* 印刷用コンテンツ（ConfirmedShiftTableと同じ構造） */}
      {printMode && (
        <div className="print-only">
          {(printMode === 'first' || printMode === 'both') && renderPrintSection('first')}
          {printMode === 'both' && renderPrintSection('second', true)}
          {printMode === 'second' && renderPrintSection('second')}
        </div>
      )}
    </>
  );
}
