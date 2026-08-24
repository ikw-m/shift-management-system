import { useState, useEffect } from 'react';
import { format, getDaysInMonth, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Download, LogOut, Store } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ShiftCondition } from '../types';
import { generateShiftExcel } from '../utils/generateShiftExcel';

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
  const [downloading, setDownloading] = useState(false);
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
    getMonthlyProcedure(year, month, departmentId).then(p =>
      setNoteText(p || 'このシフト確認表には、管理者によって承認された勤務希望のみが表示されています。')
    );
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

  const isSaleDay = (date: Date): boolean => {
    if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return false;
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    return ['springSale', 'summerSale', 'winterSale'].some(type => {
      const row = shiftCondition.rows.find(r => r.type === type);
      return row ? row.dates.includes(key) : false;
    });
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

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await generateShiftExcel({
        departmentName,
        year,
        month,
        sortedEmployees,
        getConfirmedShifts,
        getRequiredStaffCount,
        getApprovedCount,
        isHoliday,
        isSaleDay,
        dailyNotes,
        noteText,
      });
    } catch (e) {
      alert('ダウンロードに失敗しました。');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-gray-800 text-sm">シフト管理表出力</span>
                <span className="text-xs text-gray-400">Ver. 5.0</span>
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

        {/* 説明テキスト */}
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            前半・後半それぞれのデザイン版とテキスト版、計4シートのExcelファイルをダウンロードします。
          </p>
        </div>

        {/* ダウンロードボタン */}
        <div className="px-4 pb-4 mt-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {downloading ? '生成中...' : 'Excelダウンロード'}
          </button>
        </div>
      </div>
    </div>
  );
}
