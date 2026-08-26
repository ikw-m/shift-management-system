import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Save, Trash2, Leaf } from 'lucide-react';
import { Employee, Availability, shiftTypeConfig, wishLevelConfig } from '../types';
import { TimeSelect } from './TimeSelect';

interface ShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  editAvailabilityId?: string;
  employee: Employee | null;
  date: Date | null;
  availabilities: Availability[];
  currentUser: Employee;
  onAddAvailability: (availability: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (availabilityId: string, startTime: string, endTime: string, shiftType: 'karintou' | 'cafe', wishLevel: number, isPaidLeave: boolean) => void;
  onRemoveAvailability: (availabilityId: string) => void;
  onApprove: (availabilityId: string) => void;
  onReject: (availabilityId: string) => void;
}

export function ShiftDialog({
  isOpen,
  onClose,
  mode,
  editAvailabilityId,
  employee,
  date,
  availabilities,
  currentUser,
  onAddAvailability,
  onEditAvailability,
  onRemoveAvailability,
}: ShiftDialogProps) {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [shiftType, setShiftType] = useState<'karintou' | 'cafe'>('karintou');
  const [wishLevel, setWishLevel] = useState(2);
  const [isPaidLeave, setIsPaidLeave] = useState(false);

  const editTarget = editAvailabilityId
    ? availabilities.find(a => a.id === editAvailabilityId) ?? null
    : null;

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'add') {
      setStartTime(currentUser.defaultStartTime || '08:00');
      setEndTime(currentUser.defaultEndTime || '17:00');
      setShiftType(currentUser.defaultShiftType || 'karintou');
      setWishLevel(currentUser.defaultWishLevel ?? 2);
      setIsPaidLeave(false);
    } else if (mode === 'edit' && editTarget) {
      setStartTime(editTarget.startTime);
      setEndTime(editTarget.endTime);
      setShiftType(editTarget.shiftType);
      setWishLevel(editTarget.wishLevel ?? 2);
      setIsPaidLeave(editTarget.isPaidLeave ?? false);
    }
  }, [isOpen, mode, editAvailabilityId]);

  if (!isOpen || !employee || !date) return null;
  if (mode === 'edit' && !editTarget) return null;

  const handleSubmit = () => {
    if (mode === 'add') {
      onAddAvailability({ employeeId: employee.id, date, startTime, endTime, shiftType, wishLevel, isPaidLeave });
    } else if (editTarget) {
      onEditAvailability(editTarget.id, startTime, endTime, shiftType, wishLevel, isPaidLeave);
    }
    onClose();
  };

  const canDelete = editTarget
    ? (editTarget.employeeId === currentUser.id && editTarget.status !== 'approved')
    : false;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-indigo-100 max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            希望シフト入力
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 従業員 */}
        <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
          <p className="text-indigo-600 text-sm mb-1">従業員</p>
          <p className="text-gray-800 font-semibold">{employee.name}</p>
          <p className="text-indigo-500 text-sm">{employee.role}</p>
        </div>

        {/* 日付 */}
        <div className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
          <p className="text-purple-600 text-sm mb-1">日付</p>
          <p className="text-gray-800 font-semibold">{format(date, 'yyyy年M月d日 (E)', { locale: ja })}</p>
        </div>

        {/* フォーム（ベージュ枠） */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <p className="text-sm font-semibold mb-3 text-gray-800">
            {mode === 'add' ? '勤務希望を追加' : '勤務希望を編集'}
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="flex flex-col items-start gap-0.5">
                <label className="block text-xs text-gray-700 mb-1">勤務開始時間</label>
                <TimeSelect value={startTime} onChange={setStartTime} className="w-32 text-base" />
              </div>
              <span className="text-gray-500 mt-5">〜</span>
              <div className="flex flex-col items-start gap-0.5">
                <label className="block text-xs text-gray-700 mb-1">勤務終了時間</label>
                <TimeSelect value={endTime} onChange={setEndTime} className="w-32 text-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-700">シフトタイプ</label>
              <div className="flex gap-2">
                {Object.entries(shiftTypeConfig).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setShiftType(key as 'karintou' | 'cafe')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 hover:scale-105 ${
                      shiftType === key ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                    style={shiftType === key ? { backgroundColor: val.color } : {}}
                  >
                    {key === 'karintou' ? '◉' : '◆'} {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 希望レベル・有休申請（センタリングで左右余白を均等に） */}
            <div className="flex justify-center">
              <div className="flex items-stretch gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 font-medium text-sm">希望レベル</label>
                  <div className="flex gap-1.5">
                    {[3, 2, 1].map(level => {
                      const cfg = wishLevelConfig[level];
                      const isSelected = wishLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setWishLevel(level)}
                          className={`w-[76px] flex-shrink-0 py-1.5 rounded-xl border-2 font-bold transition-all duration-200 hover:scale-105 ${
                            isSelected
                              ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`
                              : 'bg-white text-gray-400 border-gray-200'
                          }`}
                        >
                          <div className="text-base leading-none mb-0.5">{cfg.badge}</div>
                          <div className="text-[11px]">{cfg.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="w-px bg-gray-200 flex-shrink-0" />
                <div className="flex flex-col gap-2">
                  <label className="text-gray-700 font-medium text-sm">有休申請</label>
                  <button
                    type="button"
                    onClick={() => setIsPaidLeave(v => !v)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 rounded-xl border-2 font-bold transition-all duration-200 hover:scale-105 ${
                      isPaidLeave
                        ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                        : 'border-dashed border-red-400 text-red-400 bg-white'
                    }`}
                  >
                    <Leaf className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs whitespace-nowrap">有休</span>
                  </button>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 pt-1">
              {mode === 'edit' && canDelete && (
                <button
                  onClick={() => { onRemoveAvailability(editTarget!.id); onClose(); }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1 text-sm hover:scale-105"
                >
                  <Trash2 className="w-3 h-3" />削除
                </button>
              )}
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1 text-sm"
              >
                {mode === 'add' ? '勤務希望を追加' : <><Save className="w-3 h-3" />保存</>}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
