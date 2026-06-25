import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { format, isSameDay, getDaysInMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, Check, X, Edit, Trash2, Clock, CheckCheck, XCircle } from 'lucide-react';
import { Employee, Availability, shiftTypeConfig, wishLevelConfig, ShiftCondition } from '../types';
import { useData } from '../context/DataContext';

interface ShiftCalendarProps {
  year: number;
  month: number;
  half: 'first' | 'second';
  employees: Employee[];
  availabilities: Availability[];
  currentUser: Employee;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onHalfChange: (half: 'first' | 'second') => void;
  onCellClick: (employeeId: string, date: Date) => void;
  onAddClick: (employeeId: string, date: Date) => void;
  onApprove: (availabilityId: string) => void;
  onReject: (availabilityId: string) => void;
  onRemoveAvailability: (availabilityId: string) => void;
}

export interface ShiftCalendarRef {
  getScrollTop: () => number;
  setScrollTop: (position: number) => void;
}

export const ShiftCalendar = forwardRef<ShiftCalendarRef, ShiftCalendarProps>(({
  year,
  month,
  half,
  employees,
  availabilities,
  currentUser,
  onYearChange,
  onMonthChange,
  onHalfChange,
  onCellClick,
  onAddClick,
  onApprove,
  onReject,
  onRemoveAvailability,
}, ref) => {
  const { getShiftCondition } = useData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shiftCondition, setShiftCondition] = useState<ShiftCondition | null>(null);

  // シフト条件設定を読み込み
  useEffect(() => {
    const loadShiftCondition = async () => {
      const condition = await getShiftCondition(year);
      setShiftCondition(condition);
    };
    loadShiftCondition();
  }, [year, getShiftCondition]);

  // 親コンポーネントからスクロール位置にアクセスできるようにする
  useImperativeHandle(ref, () => ({
    getScrollTop: () => scrollContainerRef.current?.scrollTop || 0,
    setScrollTop: (position: number) => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = position;
      }
    }
  }));
  // 従業員をソート：1行目はログイン中の従業員、それ以降はdisplayOrder順
  const sortedEmployees = [
    currentUser,
    ...employees.filter(emp => emp.id !== currentUser.id).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  ];

  // 表示する日付範囲を取得
  const getDays = () => {
    const startDay = half === 'first' ? 1 : 16;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const endDay = half === 'first' ? 15 : daysInMonth;

    const days: Date[] = [];
    for (let day = startDay; day <= endDay; day++) {
      days.push(new Date(year, month - 1, day));
    }
    return days;
  };

  const displayDays = getDays();

  const getAvailabilitiesForEmployeeAndDate = (employeeId: string, date: Date) => {
    return availabilities.filter(
      (availability) => availability.employeeId === employeeId && isSameDay(availability.date, date)
    );
  };

  // 年の選択肢を生成（現在年の前後5年）
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

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

  // セール日判定
  const isSaleDay = (date: Date): boolean => {
    if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return false;
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    return ['springSale', 'summerSale', 'winterSale'].some(type => {
      const row = shiftCondition.rows.find(r => r.type === type);
      return row?.dates.includes(key);
    });
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
        .shift-calendar-fixed-column {
          left: -2px !important;
          padding-left: 4px;
        }
        .shift-calendar-fixed-column-left::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #a5b4fc;
          z-index: 50;
        }
        .shift-calendar-fixed-column-right::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #a5b4fc;
          z-index: 50;
        }
        .shift-calendar-fixed-row-top::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: -1px;
          height: 3px;
          background-color: #a5b4fc;
          z-index: 50;
        }
        .shift-calendar-fixed-row-bottom::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background-color: #a5b4fc;
          z-index: 50;
        }
        .shift-calendar-corner-cell {
          left: -2px !important;
          top: -1px !important;
          padding: 11px 10px 10px 12px !important;
        }
        .shift-calendar-corner-cell::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          border-top: 2px solid #a5b4fc;
          border-left: 2px solid #a5b4fc;
          z-index: 50;
          pointer-events: none;
        }
        .shift-calendar-corner-cell::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          border-bottom: 2px solid #a5b4fc;
          border-right: 2px solid #a5b4fc;
          z-index: 50;
          pointer-events: none;
        }
      `}</style>
      <div className="bg-white backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl flex flex-col">
      {/* 表題部分 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="flex items-center gap-2 text-gray-800 text-base">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            シフト管理入力
          </h2>
          {/* 凡例 */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ backgroundColor: shiftTypeConfig.karintou.bgColor, borderColor: shiftTypeConfig.karintou.borderColor }}>
              <span className="text-[10px] font-medium" style={{ color: shiftTypeConfig.karintou.color }}>◉ {shiftTypeConfig.karintou.label}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ backgroundColor: shiftTypeConfig.cafe.bgColor, borderColor: shiftTypeConfig.cafe.borderColor }}>
              <span className="text-[10px] font-medium" style={{ color: shiftTypeConfig.cafe.color }}>◆ {shiftTypeConfig.cafe.label}</span>
            </div>
            <div className="h-4 w-px bg-gray-300 my-auto"></div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-red-300 bg-red-100">
              <span className="text-[10px] font-medium text-red-700">休日（赤）</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-green-300 bg-green-100">
              <span className="text-[10px] font-medium text-green-700">セール日（緑）</span>
            </div>
            <div className="h-4 w-px bg-gray-300 my-auto"></div>
            <div className="flex items-center gap-1 bg-gradient-to-r from-gray-50 to-gray-100 px-2 py-1 rounded-lg border border-gray-300">
              <div className="w-2.5 h-2.5 rounded-md bg-gray-100 border border-gray-400 shadow-sm" />
              <span className="text-[10px] font-medium text-gray-600">承認待ち（薄色）</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300" style={{ backgroundColor: '#333' }}>
              <div className="w-2.5 h-2.5 rounded-md border shadow-sm" style={{ backgroundColor: '#333', borderColor: '#333' }} />
              <span className="text-[10px] font-medium text-white">承認済み（濃色）</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-2.5 py-1.5 text-sm rounded-lg border border-indigo-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-colors"
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
            className="px-2.5 py-1.5 text-sm rounded-lg border border-indigo-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-colors"
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
            className="px-2.5 py-1.5 text-sm rounded-lg border border-indigo-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 transition-colors"
          >
            <option value="first">前半（1-15日）</option>
            <option value="second">後半（16-{getDaysInMonth(new Date(year, month - 1))}日）</option>
          </select>
        </div>
      </div>

      {/* テーブル部分（ヘッダー固定、ボディスクロール） */}
      <div ref={scrollContainerRef} className="overflow-auto max-h-[calc(100vh-320px)]">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '100px' }} />
            {displayDays.map((day) => (
              <col key={day.toISOString()} style={{ width: '90px' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="p-2.5 border border-indigo-100 bg-indigo-100 sticky z-20 relative shift-calendar-corner-cell">従業員</th>
              {displayDays.map((day) => {
                const isSundayDay = isSunday(day);
                const isSaturdayDay = isSaturday(day);
                const isHolidayDay = isHoliday(day);
                const isSaleDayFlag = isSaleDay(day);
                const isSpecialDay = isSundayDay || isSaturdayDay || isHolidayDay;
                const requiredStaff = getRequiredStaffCount(day);
                const headerBg = isSpecialDay ? 'bg-red-100' : isSaleDayFlag ? 'bg-green-100' : 'bg-indigo-100';
                const headerText = isSpecialDay ? 'text-red-600' : isSaleDayFlag ? 'text-green-700' : 'text-gray-800';
                const subText = isSpecialDay ? 'text-red-500' : isSaleDayFlag ? 'text-green-600' : 'text-indigo-600';
                return (
                  <th
                    key={day.toISOString()}
                    className={`p-2.5 border border-indigo-100 sticky top-0 z-10 shift-calendar-fixed-row-top shift-calendar-fixed-row-bottom ${headerBg}`}
                  >
                    <div className="text-center">
                      <div className={`font-semibold text-sm ${headerText}`}>
                        {format(day, 'M/d', { locale: ja })}({format(day, 'E', { locale: ja })})
                      </div>
                      <div className={`text-xs ${subText}`}>
                        要員数【{requiredStaff}人】
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="p-2.5 border border-indigo-100 bg-white sticky left-0 z-10 relative shift-calendar-fixed-column shift-calendar-fixed-column-left shift-calendar-fixed-column-right">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shadow-md"
                      style={{ backgroundColor: employee.color }}
                    />
                    <span className="font-medium text-gray-700 text-sm">{employee.name}</span>
                  </div>
                </td>
                {displayDays.map((day) => {
                  const isSundayDay = isSunday(day);
                  const isSaturdayDay = isSaturday(day);
                  const isHolidayDay = isHoliday(day);
                  const isSaleDayFlag = isSaleDay(day);
                  const isSpecialDay = isSundayDay || isSaturdayDay || isHolidayDay;
                  const cellBg = isSpecialDay ? 'bg-red-50/30' : isSaleDayFlag ? 'bg-green-50/40' : 'bg-white/40';
                  const dayAvailabilities = getAvailabilitiesForEmployeeAndDate(employee.id, day);
                  return (
                    <td
                      key={`${employee.id}-${day.toISOString()}`}
                      className={`p-1.5 border border-indigo-100 align-top ${cellBg}`}
                    >
                      <div className="space-y-1.5">{dayAvailabilities.map((availability) => {
                          // シフトタイプの色設定
                          const shiftColor = shiftTypeConfig[availability.shiftType];

                          // ステータスに応じたスタイル設定
                          const getStatusStyle = () => {
                            if (availability.status === 'approved') {
                              // 承認済み：シフトタイプの濃い色を背景に、白テキスト（反転）
                              return {
                                backgroundColor: shiftColor.color,
                                color: '#ffffff',
                                borderColor: shiftColor.color,
                                fontWeight: '600',
                              };
                            } else if (availability.status === 'pending') {
                              // 承認待ち：シフトタイプの薄い色を背景に、濃いテキスト
                              return {
                                backgroundColor: shiftColor.bgColor,
                                color: shiftColor.color,
                                borderColor: shiftColor.borderColor,
                                fontWeight: '500',
                              };
                            } else {
                              // 却下：グレー系
                              return {
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                                borderColor: '#d1d5db',
                                fontWeight: '400',
                              };
                            }
                          };

                          const statusStyle = getStatusStyle();
                          const statusLabels = {
                            pending: { text: '承認待ち', icon: Clock },
                            approved: { text: '承認済み', icon: CheckCheck },
                            rejected: { text: '却下', icon: XCircle },
                          };

                          const StatusIcon = statusLabels[availability.status].icon;
                          const shiftTypeSymbol = availability.shiftType === 'karintou' ? '◉' : '◆';

                          return (
                            <div
                              key={availability.id}
                              className="px-1.5 py-1.5 rounded-lg text-xs border transition-all duration-200 hover:shadow-md"
                              style={{
                                backgroundColor: statusStyle.backgroundColor,
                                color: statusStyle.color,
                                borderColor: statusStyle.borderColor,
                              }}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-0.5">
                                  <StatusIcon className="w-2.5 h-2.5" style={{ color: statusStyle.color }} />
                                  <span className="font-semibold text-[10px]" style={{ fontWeight: statusStyle.fontWeight }}>
                                    {statusLabels[availability.status].text}
                                  </span>
                                </div>
                                {availability.status === 'pending' && currentUser.isManager && (
                                  <div className="flex gap-0.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onApprove(availability.id);
                                      }}
                                      className="p-0.5 hover:bg-emerald-200 rounded-md transition-all duration-200 hover:scale-110"
                                      title="承認"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onReject(availability.id);
                                      }}
                                      className="p-0.5 hover:bg-rose-200 rounded-md transition-all duration-200 hover:scale-110"
                                      title="却下"
                                    >
                                      <XCircle className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                                {availability.status === 'pending' && !currentUser.isManager && availability.employeeId === currentUser.id && (
                                  <div className="flex gap-0.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCellClick(availability.employeeId, availability.date);
                                      }}
                                      className="p-0.5 hover:bg-blue-200 rounded-md transition-all duration-200 hover:scale-110"
                                      title="編集"
                                    >
                                      <Edit className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveAvailability(availability.id);
                                      }}
                                      className="p-0.5 hover:bg-rose-200 rounded-md transition-all duration-200 hover:scale-110"
                                      title="削除"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                                {availability.status === 'approved' && currentUser.isManager && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReject(availability.id);
                                    }}
                                    className="p-0.5 hover:bg-rose-200 rounded-md transition-all duration-200 hover:scale-110"
                                    title="却下に変更"
                                  >
                                    <XCircle className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                {availability.status === 'rejected' && currentUser.isManager && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApprove(availability.id);
                                    }}
                                    className="p-0.5 hover:bg-emerald-200 rounded-md transition-all duration-200 hover:scale-110"
                                    title="承認済みに変更"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                              <div className="text-center font-medium text-[10px]">
                                {shiftTypeSymbol} {availability.startTime} - {availability.endTime}
                              </div>
                              {(() => {
                                const level = availability.wishLevel ?? 2;
                                const cfg = wishLevelConfig[level];
                                return (
                                  <div className={`text-center text-[9px] font-bold px-1 py-0.5 rounded mt-0.5 ${cfg.bgColor} ${cfg.textColor}`}>
                                    {cfg.badge} {cfg.label}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                        {(currentUser.isManager || currentUser.id === employee.id) && (
                          <button
                            onClick={() => onAddClick(employee.id, day)}
                            className="w-full px-1.5 py-1 text-[10px] text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 border border-dashed border-indigo-200 hover:border-indigo-400 hover:shadow-sm"
                          >
                            + 追加
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-gray-200">
        {!currentUser.isManager && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl space-y-0.5 border border-blue-200 shadow-sm">
            <p className="text-xs text-blue-800">
              ※ 勤務希望の承認・却下は管理者権限を持つ従業員のみが行えます
            </p>
            <p className="text-xs text-blue-800">
              ※ スタッフは自分の承認待ち勤務希望のみ編集・削除できます
            </p>
          </div>
        )}
        {currentUser.isManager && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 shadow-sm">
            <p className="text-xs text-purple-800">
              ※ マネージャーは承認済み・却下の勤務データをステータス変更できます
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
});

ShiftCalendar.displayName = 'ShiftCalendar';
