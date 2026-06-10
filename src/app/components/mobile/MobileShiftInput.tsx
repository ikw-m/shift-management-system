import { useState } from 'react';
import { format, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Check, XCircle, Edit, Save, Clock, CheckCircle } from 'lucide-react';
import { Employee, Availability, shiftTypeConfig } from '../../types';

interface MobileShiftInputProps {
  currentUser: Employee;
  employees: Employee[];
  availabilities: Availability[];
  onAddAvailability: (a: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (id: string, startTime: string, endTime: string) => void;
  onRemoveAvailability: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MobileShiftInput({
  currentUser,
  availabilities,
  onAddAvailability,
  onEditAvailability,
  onRemoveAvailability,
  onApprove,
  onReject,
}: MobileShiftInputProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [shiftType, setShiftType] = useState<'karintou' | 'cafe'>('karintou');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  const isManager = currentUser.role === 'manager' || currentUser.isManager === true;
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const getAvailabilitiesForDate = (date: Date) =>
    availabilities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate();
    });

  const getMyAvailabilitiesForDate = (date: Date) =>
    getAvailabilitiesForDate(date).filter(a => a.employeeId === currentUser.id);

  const handleDayTap = (day: number) => {
    setSelectedDate(new Date(year, month - 1, day));
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!selectedDate) return;
    onAddAvailability({
      employeeId: currentUser.id,
      date: selectedDate,
      startTime,
      endTime,
      shiftType,
    });
    setStartTime('08:00');
    setEndTime('17:00');
  };

  const statusConfig = {
    pending:  { label: '承認待ち', icon: Clock,        className: 'bg-yellow-50 border-yellow-300 text-yellow-900' },
    approved: { label: '承認済み', icon: CheckCircle,  className: 'bg-green-50 border-green-300 text-green-900' },
    rejected: { label: '却下',     icon: XCircle,      className: 'bg-red-50 border-red-300 text-red-900' },
  };

  const selectedAvailabilities = selectedDate ? getMyAvailabilitiesForDate(selectedDate) : [];
  const allSelectedAvailabilities = selectedDate ? getAvailabilitiesForDate(selectedDate) : [];

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

      {/* カレンダー */}
      <div className="px-3 py-2 bg-white">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-semibold py-1 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const date = new Date(year, month - 1, day);
            const isSun = isSunday(date);
            const isSat = isSaturday(date);
            const myShifts = getMyAvailabilitiesForDate(date);
            const isSelected =
              selectedDate &&
              selectedDate.getFullYear() === year &&
              selectedDate.getMonth() === month - 1 &&
              selectedDate.getDate() === day;

            const hasApproved = myShifts.some(a => a.status === 'approved');
            const hasPending  = myShifts.some(a => a.status === 'pending');
            const hasRejected = myShifts.some(a => a.status === 'rejected');
            const dotColor = hasApproved ? 'bg-green-500' : hasPending ? 'bg-yellow-400' : hasRejected ? 'bg-red-400' : null;

            return (
              <button
                key={day}
                onClick={() => handleDayTap(day)}
                className={`
                  flex flex-col items-center justify-center rounded-xl py-1.5 mx-0.5 transition-all active:scale-95
                  ${isSelected
                    ? 'bg-indigo-600 shadow-md'
                    : 'bg-gray-50 active:bg-indigo-100'}
                `}
              >
                <span
                  className={`text-sm font-semibold leading-none ${
                    isSelected
                      ? 'text-white'
                      : isSun
                      ? 'text-red-500'
                      : isSat
                      ? 'text-blue-500'
                      : 'text-gray-800'
                  }`}
                >
                  {day}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor ?? 'opacity-0 w-1.5 h-1.5'} ${isSelected && dotColor ? 'bg-white' : dotColor ?? ''}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の詳細 */}
      {selectedDate && (
        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 pt-3 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">
              {format(selectedDate, 'M月d日(E)', { locale: ja })}
            </h2>
            <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg bg-gray-200">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* マネージャー向け：全員のシフト表示 */}
          {isManager && allSelectedAvailabilities.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-medium mb-2">全員のシフト</p>
              <div className="space-y-2">
                {allSelectedAvailabilities.map(a => {
                  const emp = a.employeeId === currentUser.id ? currentUser : null;
                  const cfg = statusConfig[a.status];
                  return (
                    <div key={a.id} className={`p-3 rounded-xl border ${cfg.className} flex items-center justify-between`}>
                      <div>
                        <span className="text-xs font-semibold mr-2">
                          {a.shiftType === 'karintou' ? '◉' : '◆'} {shiftTypeConfig[a.shiftType].label}
                        </span>
                        <span className="text-sm">{a.startTime}〜{a.endTime}</span>
                        <span className="text-xs ml-2 text-gray-500">{cfg.label}</span>
                      </div>
                      {a.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onApprove(a.id)}
                            className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs active:scale-95"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onReject(a.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs active:scale-95"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 自分の登録済みシフト */}
          {selectedAvailabilities.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-medium mb-2">登録済み（自分）</p>
              <div className="space-y-2">
                {selectedAvailabilities.map(a => {
                  const cfg = statusConfig[a.status];
                  const canEdit = isManager || a.status === 'pending';
                  return (
                    <div key={a.id} className={`p-3 rounded-xl border ${cfg.className}`}>
                      {editingId === a.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)}
                              className="flex-1 px-2 py-2 border border-indigo-200 rounded-lg text-sm bg-white" />
                            <span className="self-center text-gray-500">〜</span>
                            <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)}
                              className="flex-1 px-2 py-2 border border-indigo-200 rounded-lg text-sm bg-white" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { onEditAvailability(a.id, editStartTime, editEndTime); setEditingId(null); }}
                              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center justify-center gap-1 active:scale-95">
                              <Save className="w-3 h-3" /> 保存
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="flex-1 py-2 bg-gray-500 text-white rounded-lg text-sm active:scale-95">
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold mr-1">
                              {a.shiftType === 'karintou' ? '◉' : '◆'}
                            </span>
                            <span className="text-sm font-medium">{a.startTime}〜{a.endTime}</span>
                            <span className="text-xs ml-2">{cfg.label}</span>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingId(a.id); setEditStartTime(a.startTime); setEditEndTime(a.endTime); }}
                                className="p-1.5 bg-blue-100 rounded-lg active:scale-95">
                                <Edit className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              <button onClick={() => onRemoveAvailability(a.id)}
                                className="p-1.5 bg-red-100 rounded-lg active:scale-95">
                                <X className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 新規登録フォーム */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">勤務希望を追加</p>
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">開始時間</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-50 border border-indigo-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <span className="text-gray-400 mt-5">〜</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">終了時間</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-3 bg-gray-50 border border-indigo-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">シフトタイプ</label>
                <div className="flex gap-2">
                  {Object.entries(shiftTypeConfig).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setShiftType(key as 'karintou' | 'cafe')}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
                        shiftType === key
                          ? 'border-transparent text-white shadow-md'
                          : 'border-gray-200 text-gray-600 bg-white'
                      }`}
                      style={shiftType === key ? { backgroundColor: val.color } : {}}
                    >
                      {key === 'karintou' ? '◉' : '◆'} {val.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAdd}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-base shadow-md active:scale-95 transition-all"
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedDate && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p className="text-sm">日付をタップしてシフトを登録</p>
        </div>
      )}
    </div>
  );
}
