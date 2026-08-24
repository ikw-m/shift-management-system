import { useState, useRef } from 'react';
import { Save, Trash2, X } from 'lucide-react';
import { Employee, ShiftCondition, ShiftConditionRow, ShiftConditionRowType } from '../../types';
import { useData } from '../../context/DataContext';

const ROW_LABELS: Record<ShiftConditionRowType, string> = {
  monday: '月曜日',
  tuesday: '火曜日',
  wednesday: '水曜日',
  thursday: '木曜日',
  friday: '金曜日',
  saturday: '土曜日',
  sunday: '日曜日',
  holiday: '祝日',
  springSale: '春セール',
  summerSale: '夏セール',
  winterSale: '冬セール',
};

const ROW_TYPES: ShiftConditionRowType[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'holiday', 'springSale', 'summerSale', 'winterSale',
];

const getHolidays = (year: number): string[] => {
  const fixed: Date[] = [
    new Date(year, 0, 1), new Date(year, 1, 11), new Date(year, 1, 23),
    new Date(year, 3, 29), new Date(year, 4, 3), new Date(year, 4, 4),
    new Date(year, 4, 5), new Date(year, 7, 11), new Date(year, 10, 3),
    new Date(year, 10, 23),
  ];
  const getNth = (y: number, m: number, wd: number, n: number) => {
    let c = 0; const d = new Date(y, m - 1, 1);
    while (d.getMonth() === m - 1) { if (d.getDay() === wd) { c++; if (c === n) return d.getDate(); } d.setDate(d.getDate() + 1); }
    return 1;
  };
  const vernal = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  const autumnal = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  fixed.push(
    new Date(year, 0, getNth(year, 1, 1, 2)),
    new Date(year, 6, getNth(year, 7, 1, 3)),
    new Date(year, 8, getNth(year, 9, 1, 3)),
    new Date(year, 9, getNth(year, 10, 1, 2)),
    new Date(year, 2, vernal),
    new Date(year, 8, autumnal),
  );
  const isH = (d: Date) => fixed.some(h => h.getFullYear() === d.getFullYear() && h.getMonth() === d.getMonth() && h.getDate() === d.getDate());
  const transfers: Date[] = [];
  for (const h of fixed) {
    if (h.getDay() === 0) {
      const t = new Date(h); t.setDate(t.getDate() + 1);
      while (isH(t) || t.getDay() === 0) t.setDate(t.getDate() + 1);
      transfers.push(new Date(t));
    }
  }
  const all = [...fixed, ...transfers];
  const unique = Array.from(new Set(all.map(d => d.getTime()))).map(t => new Date(t)).sort((a, b) => a.getTime() - b.getTime());
  return unique.map(d => `${d.getMonth() + 1}/${d.getDate()}`);
};

interface MobileShiftConditionSettingsProps {
  currentUser: Employee;
  departmentName: string;
  onBack: () => void;
  onLogout: () => void;
}

export function MobileShiftConditionSettings({ currentUser, departmentName, onBack, onLogout }: MobileShiftConditionSettingsProps) {
  const { getShiftCondition, saveShiftCondition } = useData();
  const [inputYear, setInputYear] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [mode, setMode] = useState<'register' | 'update' | null>(null);
  const [rows, setRows] = useState<ShiftConditionRow[]>([]);
  const [expandedRow, setExpandedRow] = useState<ShiftConditionRowType | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const departmentId = currentUser.departmentId;

  const handleDisplay = async () => {
    const year = parseInt(inputYear);
    if (isNaN(year) || year < 1900 || year > 2100) {
      alert('正しい年を入力してください（1900〜2100）');
      return;
    }
    setSelectedYear(year);
    const existing = await getShiftCondition(year, departmentId);
    if (existing) {
      setMode('update');
      setRows(existing.rows);
    } else {
      setMode('register');
      setRows(ROW_TYPES.map(type => ({
        type,
        requiredStaff: 0,
        dates: type === 'holiday' ? getHolidays(year) : [],
      })));
    }
  };

  const handleSave = async () => {
    if (!selectedYear) return;
    const cleanedRows = rows.map(row => ({
      ...row,
      dates: row.dates.filter(d => d.trim() !== ''),
    }));
    const condition: ShiftCondition = { year: selectedYear, rows: cleanedRows };
    try {
      await saveShiftCondition(selectedYear, condition, departmentId);
      alert(mode === 'register' ? '登録しました' : '更新しました');
      handleCancel();
    } catch {
      alert('保存に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!selectedYear) return;
    if (!window.confirm(`${selectedYear}年のシフト条件を削除しますか？`)) return;
    try {
      await saveShiftCondition(selectedYear, { year: selectedYear, rows: [] }, departmentId);
      alert('削除しました');
      handleCancel();
    } catch {
      alert('削除に失敗しました');
    }
  };

  const handleCancel = () => {
    setSelectedYear(null);
    setMode(null);
    setRows([]);
    setInputYear('');
    setExpandedRow(null);
  };

  const updateRequiredStaff = (rowIndex: number, value: number) => {
    const newRows = [...rows];
    newRows[rowIndex].requiredStaff = value;
    setRows(newRows);
  };

  const updateDate = (rowIndex: number, dateIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex].dates[dateIndex] = value;
    setRows(newRows);
  };

  const addDate = (rowIndex: number) => {
    const newRows = [...rows];
    if (newRows[rowIndex].dates.length < 20) {
      const newIdx = newRows[rowIndex].dates.length;
      newRows[rowIndex].dates.push('');
      setRows(newRows);
      setTimeout(() => inputRefs.current[`${rowIndex}-${newIdx}`]?.focus(), 0);
    }
  };

  const removeDate = (rowIndex: number, dateIndex: number) => {
    const newRows = [...rows];
    newRows[rowIndex].dates = newRows[rowIndex].dates.filter((_, i) => i !== dateIndex);
    setRows(newRows);
  };

  const canEditDates = (type: ShiftConditionRowType) =>
    ['holiday', 'springSale', 'summerSale', 'winterSale'].includes(type);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
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
            <span className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              シフト条件設定
            </span>
          </div>
          <button onClick={onBack} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 active:bg-indigo-100">
            メニュー
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* 年入力 */}
        {!mode ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">対象年を入力してください</p>
            <div className="flex gap-3">
              <input
                type="number"
                value={inputYear}
                onChange={e => setInputYear(e.target.value)}
                placeholder="例：2026"
                className="flex-1 px-4 py-3 border border-indigo-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={handleDisplay}
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold active:scale-95">
                表示
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 年表示 */}
            <div className="bg-indigo-50 rounded-xl px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-700">{selectedYear}年 — {mode === 'register' ? '新規登録' : '更新'}</span>
              <button onClick={handleCancel} className="text-xs text-gray-500 underline">戻る</button>
            </div>

            {/* 行ごとのカード */}
            {rows.map((row, rowIndex) => (
              <div key={row.type} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedRow(expandedRow === row.type ? null : row.type)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800 text-sm">{ROW_LABELS[row.type]}</span>
                    {canEditDates(row.type) && (
                      <span className="text-xs text-gray-400">{row.dates.filter(d => d).length}件</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <span className="text-xs text-gray-400">要員数</span>
                      <input
                        type="number"
                        min="0"
                        value={row.requiredStaff}
                        onChange={e => { e.stopPropagation(); updateRequiredStaff(rowIndex, parseInt(e.target.value) || 0); }}
                        onClick={e => e.stopPropagation()}
                        className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-400">人</span>
                    </div>
                    {canEditDates(row.type) && (
                      <span className="text-gray-400 text-xs">{expandedRow === row.type ? '▲' : '▼'}</span>
                    )}
                  </div>
                </button>

                {canEditDates(row.type) && expandedRow === row.type && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-xs text-gray-500 mb-2">日付（M/D形式、最大20件）</p>
                    <div className="flex flex-wrap gap-2">
                      {row.dates.map((date, dateIndex) => (
                        <div key={dateIndex} className="flex items-center gap-1">
                          <input
                            ref={el => { inputRefs.current[`${rowIndex}-${dateIndex}`] = el; }}
                            type="text"
                            value={date}
                            onChange={e => updateDate(rowIndex, dateIndex, e.target.value)}
                            placeholder="M/D"
                            className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                          />
                          <button onClick={() => removeDate(rowIndex, dateIndex)}
                            className="p-1 text-rose-500 active:bg-rose-50 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {row.dates.length < 20 && (
                        <button onClick={() => addDate(rowIndex)}
                          className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg active:bg-indigo-100">
                          + 追加
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 操作ボタン */}
            <div className="space-y-2 pb-6">
              <button onClick={handleSave}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 shadow-md">
                <Save className="w-4 h-4" />
                {mode === 'register' ? '登録する' : '更新する'}
              </button>
              {mode === 'update' && (
                <button onClick={handleDelete}
                  className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-95">
                  <Trash2 className="w-4 h-4" />
                  この年の条件を削除
                </button>
              )}
              <button onClick={handleCancel}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl text-sm active:scale-95">
                取消
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
