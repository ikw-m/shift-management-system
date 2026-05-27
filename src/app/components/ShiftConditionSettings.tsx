import { useState, useRef, useEffect } from 'react';
import { Settings, Save, Trash2, X } from 'lucide-react';
import { ShiftCondition, ShiftConditionRow, ShiftConditionRowType } from '../types';
import { useData } from '../context/DataContext';

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
  'holiday', 'springSale', 'summerSale', 'winterSale'
];

// 祝日データ（年によって変動する祝日を計算）
const getHolidays = (year: number): string[] => {
  const holidayDates: Date[] = [];

  // 固定祝日
  holidayDates.push(new Date(year, 0, 1));    // 元日
  holidayDates.push(new Date(year, 1, 11));   // 建国記念の日
  holidayDates.push(new Date(year, 1, 23));   // 天皇誕生日
  holidayDates.push(new Date(year, 3, 29));   // 昭和の日
  holidayDates.push(new Date(year, 4, 3));    // 憲法記念日
  holidayDates.push(new Date(year, 4, 4));    // みどりの日
  holidayDates.push(new Date(year, 4, 5));    // こどもの日
  holidayDates.push(new Date(year, 7, 11));   // 山の日
  holidayDates.push(new Date(year, 10, 3));   // 文化の日
  holidayDates.push(new Date(year, 10, 23));  // 勤労感謝の日

  // 成人の日（1月の第2月曜日）
  const janSecondMonday = getNthWeekday(year, 1, 1, 2);
  holidayDates.push(new Date(year, 0, janSecondMonday));

  // 海の日（7月の第3月曜日）
  const julyThirdMonday = getNthWeekday(year, 7, 1, 3);
  holidayDates.push(new Date(year, 6, julyThirdMonday));

  // 敬老の日（9月の第3月曜日）
  const septThirdMonday = getNthWeekday(year, 9, 1, 3);
  holidayDates.push(new Date(year, 8, septThirdMonday));

  // スポーツの日（10月の第2月曜日）
  const octSecondMonday = getNthWeekday(year, 10, 1, 2);
  holidayDates.push(new Date(year, 9, octSecondMonday));

  // 春分の日（概算：年によって変わる）
  const vernalEquinox = getVernalEquinoxDay(year);
  holidayDates.push(new Date(year, 2, vernalEquinox));

  // 秋分の日（概算：年によって変わる）
  const autumnalEquinox = getAutumnalEquinoxDay(year);
  holidayDates.push(new Date(year, 8, autumnalEquinox));

  // 振替休日を追加
  const transferHolidays = getTransferHolidays(year, holidayDates);
  holidayDates.push(...transferHolidays);

  // 国民の休日を追加
  const nationalHolidays = getNationalHolidays(year, holidayDates);
  holidayDates.push(...nationalHolidays);

  // 日付順にソートして重複を削除
  const uniqueHolidays = Array.from(new Set(holidayDates.map(d => d.getTime())))
    .map(time => new Date(time))
    .sort((a, b) => a.getTime() - b.getTime());

  // M/D形式に変換
  return uniqueHolidays.map(date => `${date.getMonth() + 1}/${date.getDate()}`);
};

// 振替休日を計算
const getTransferHolidays = (year: number, holidays: Date[]): Date[] => {
  const transferHolidays: Date[] = [];

  for (const holiday of holidays) {
    // 日曜日の祝日の場合
    if (holiday.getDay() === 0) {
      let transferDate = new Date(holiday);
      transferDate.setDate(transferDate.getDate() + 1);

      // 次の平日（祝日でない日）を探す
      while (isHolidayDate(transferDate, holidays) || transferDate.getDay() === 0) {
        transferDate.setDate(transferDate.getDate() + 1);
      }

      transferHolidays.push(new Date(transferDate));
    }
  }

  return transferHolidays;
};

// 国民の休日を計算（祝日に挟まれた平日）
const getNationalHolidays = (year: number, holidays: Date[]): Date[] => {
  const nationalHolidays: Date[] = [];
  const sortedHolidays = holidays.sort((a, b) => a.getTime() - b.getTime());

  for (let i = 0; i < sortedHolidays.length - 1; i++) {
    const current = sortedHolidays[i];
    const next = sortedHolidays[i + 1];

    // 2日後が祝日の場合、間の日が平日なら国民の休日
    const daysDiff = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 2) {
      const middleDate = new Date(current);
      middleDate.setDate(middleDate.getDate() + 1);

      // 日曜日でなく、祝日でもない場合
      if (middleDate.getDay() !== 0 && !isHolidayDate(middleDate, holidays)) {
        nationalHolidays.push(new Date(middleDate));
      }
    }
  }

  return nationalHolidays;
};

// 指定日が祝日かチェック
const isHolidayDate = (date: Date, holidays: Date[]): boolean => {
  return holidays.some(h =>
    h.getFullYear() === date.getFullYear() &&
    h.getMonth() === date.getMonth() &&
    h.getDate() === date.getDate()
  );
};

// 指定月の第N週の指定曜日を取得
const getNthWeekday = (year: number, month: number, weekday: number, nth: number): number => {
  let count = 0;
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    if (date.getDay() === weekday) {
      count++;
      if (count === nth) {
        return date.getDate();
      }
    }
    date.setDate(date.getDate() + 1);
  }
  return 1; // フォールバック
};

// 春分の日を計算（概算式）
const getVernalEquinoxDay = (year: number): number => {
  if (year >= 2000 && year <= 2099) {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 20; // デフォルト
};

// 秋分の日を計算（概算式）
const getAutumnalEquinoxDay = (year: number): number => {
  if (year >= 2000 && year <= 2099) {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 23; // デフォルト
};

export function ShiftConditionSettings() {
  const { getShiftCondition, saveShiftCondition } = useData();
  const [inputYear, setInputYear] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [mode, setMode] = useState<'register' | 'update' | null>(null);
  const [rows, setRows] = useState<ShiftConditionRow[]>([]);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleDisplay = async () => {
    const year = parseInt(inputYear);
    if (isNaN(year) || year < 1900 || year > 2100) {
      alert('正しい年を入力してください（1900-2100）');
      return;
    }

    setSelectedYear(year);
    const existing = await getShiftCondition(year);

    if (existing) {
      // 更新モード
      setMode('update');
      setRows(existing.rows);
    } else {
      // 登録モード
      setMode('register');
      const initialRows: ShiftConditionRow[] = ROW_TYPES.map(type => ({
        type,
        requiredStaff: 0,
        dates: type === 'holiday' ? getHolidays(year) : [],
      }));
      setRows(initialRows);
    }
  };

  const handleRegister = async () => {
    if (!selectedYear) return;

    // 空の日付を除外してからデータを保存
    const cleanedRows = rows.map(row => ({
      ...row,
      dates: row.dates.filter(date => date.trim() !== ''),
    }));

    const condition: ShiftCondition = {
      year: selectedYear,
      rows: cleanedRows,
    };

    try {
      await saveShiftCondition(selectedYear, condition);
      alert('登録しました');
      handleCancel();
    } catch (error) {
      alert('登録に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!selectedYear) return;

    // 空の日付を除外してからデータを保存
    const cleanedRows = rows.map(row => ({
      ...row,
      dates: row.dates.filter(date => date.trim() !== ''),
    }));

    const condition: ShiftCondition = {
      year: selectedYear,
      rows: cleanedRows,
    };

    try {
      await saveShiftCondition(selectedYear, condition);
      alert('更新しました');
      handleCancel();
    } catch (error) {
      alert('更新に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!selectedYear) return;

    if (!window.confirm(`${selectedYear}年のシフト条件を削除してもよろしいですか？`)) {
      return;
    }

    try {
      // 空のデータで上書きして削除と同等の処理をする
      await saveShiftCondition(selectedYear, { year: selectedYear, rows: [] });
      alert('削除しました');
      handleCancel();
    } catch (error) {
      alert('削除に失敗しました');
    }
  };

  const handleCancel = () => {
    setSelectedYear(null);
    setMode(null);
    setRows([]);
    setInputYear('');
  };

  const updateRow = (index: number, field: 'requiredStaff' | 'dates', value: number | string[]) => {
    const newRows = [...rows];
    if (field === 'requiredStaff' && typeof value === 'number') {
      newRows[index].requiredStaff = value;
    } else if (field === 'dates' && Array.isArray(value)) {
      newRows[index].dates = value;
    }
    setRows(newRows);
  };

  const updateDate = (rowIndex: number, dateIndex: number, value: string) => {
    const newRows = [...rows];
    const newDates = [...newRows[rowIndex].dates];
    newDates[dateIndex] = value;
    newRows[rowIndex].dates = newDates;
    setRows(newRows);
  };

  const addDate = (rowIndex: number) => {
    const newRows = [...rows];
    if (newRows[rowIndex].dates.length < 20) {
      const newDateIndex = newRows[rowIndex].dates.length;
      newRows[rowIndex].dates.push('');
      setRows(newRows);

      // 新しく追加された入力フィールドにフォーカスを当てる
      setTimeout(() => {
        const inputKey = `${rowIndex}-${newDateIndex}`;
        const inputElement = inputRefs.current[inputKey];
        if (inputElement) {
          inputElement.focus();
        }
      }, 0);
    }
  };

  const removeDate = (rowIndex: number, dateIndex: number) => {
    const newRows = [...rows];
    newRows[rowIndex].dates = newRows[rowIndex].dates.filter((_, i) => i !== dateIndex);
    setRows(newRows);
  };

  const canEditDates = (type: ShiftConditionRowType): boolean => {
    return ['holiday', 'springSale', 'summerSale', 'winterSale'].includes(type);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl flex flex-col">
      {/* ヘッダー部分 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-gray-800 text-base">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg">
              <Settings className="w-4 h-4 text-white" />
            </div>
            シフト条件設定
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="year-input" className="text-sm font-medium text-gray-700">年</label>
            <input
              id="year-input"
              type="text"
              value={inputYear}
              onChange={(e) => setInputYear(e.target.value)}
              disabled={selectedYear !== null}
              placeholder="2026"
              maxLength={4}
              className="w-24 px-3 py-1.5 text-sm rounded-lg border border-indigo-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {selectedYear === null && (
            <button
              onClick={handleDisplay}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 text-sm"
            >
              表示
            </button>
          )}
        </div>
      </div>

      {/* ボディ部分 */}
      {mode && (
        <div className="p-6 overflow-auto max-h-[calc(100vh-280px)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gradient-to-br from-indigo-50 to-purple-50">
                  <th className="p-2 border border-gray-300 text-sm font-semibold text-gray-700">項目</th>
                  <th className="p-2 border border-gray-300 text-sm font-semibold text-gray-700 w-24">要員数</th>
                  <th className="p-2 border border-gray-300 text-sm font-semibold text-gray-700">日付（最大20個）</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.type} className="hover:bg-indigo-50/30">
                    <td className="p-2 border border-gray-300 text-sm font-medium text-gray-700">
                      {ROW_LABELS[row.type]}
                    </td>
                    <td className="p-2 border border-gray-300">
                      <input
                        type="number"
                        min="0"
                        value={row.requiredStaff}
                        onChange={(e) => updateRow(rowIndex, 'requiredStaff', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-2 border border-gray-300">
                      {canEditDates(row.type) ? (
                        <div className="flex flex-wrap gap-2">
                          {row.dates.map((date, dateIndex) => (
                            <div key={dateIndex} className="flex items-center gap-1">
                              <input
                                ref={(el) => {
                                  inputRefs.current[`${rowIndex}-${dateIndex}`] = el;
                                }}
                                type="text"
                                value={date}
                                onChange={(e) => updateDate(rowIndex, dateIndex, e.target.value)}
                                placeholder="M/D"
                                className="w-16 px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                onClick={() => removeDate(rowIndex, dateIndex)}
                                className="p-0.5 text-red-600 hover:bg-red-100 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {row.dates.length < 20 && (
                            <button
                              onClick={() => addDate(rowIndex)}
                              className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                            >
                              + 追加
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">－</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-500 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            {mode === 'update' && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                <Trash2 className="w-4 h-4" />
                削除
              </button>
            )}
            <button
              onClick={mode === 'register' ? handleRegister : handleUpdate}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {mode === 'register' ? '登録' : '更新'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
