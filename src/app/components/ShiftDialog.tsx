import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Check, XCircle, Edit, Save, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { Employee, Availability, shiftTypeConfig, wishLevelConfig } from '../types';

interface ShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'manage';
  autoEditId?: string;
  employee: Employee | null;
  date: Date | null;
  availabilities: Availability[];
  currentUser: Employee;
  onAddAvailability: (availability: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (availabilityId: string, startTime: string, endTime: string, shiftType: 'karintou' | 'cafe', wishLevel: number) => void;
  onRemoveAvailability: (availabilityId: string) => void;
  onApprove: (availabilityId: string) => void;
  onReject: (availabilityId: string) => void;
}

export function ShiftDialog({
  isOpen,
  onClose,
  mode,
  autoEditId,
  employee,
  date,
  availabilities,
  currentUser,
  onAddAvailability,
  onEditAvailability,
  onRemoveAvailability,
  onApprove,
  onReject,
}: ShiftDialogProps) {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [shiftType, setShiftType] = useState<'karintou' | 'cafe'>('karintou');
  const [wishLevel, setWishLevel] = useState(2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editShiftType, setEditShiftType] = useState<'karintou' | 'cafe'>('karintou');
  const [editWishLevel, setEditWishLevel] = useState(2);

  // autoEditIdが指定されている場合、ダイアログを開いた直後に編集モードを自動開始
  useEffect(() => {
    if (isOpen && autoEditId && availabilities.length > 0) {
      const av = availabilities.find(a => a.id === autoEditId);
      if (av) {
        setEditingId(av.id);
        setEditStartTime(av.startTime);
        setEditEndTime(av.endTime);
        setEditShiftType(av.shiftType);
        setEditWishLevel(av.wishLevel ?? 2);
      }
    }
    if (!isOpen) setEditingId(null);
  }, [isOpen, autoEditId]);

  if (!isOpen || !employee || !date) return null;

  const handleAddAvailability = () => {
    onAddAvailability({
      employeeId: employee.id,
      date,
      startTime,
      endTime,
      shiftType,
      wishLevel,
    });
    setStartTime('08:00');
    setEndTime('17:00');
    setShiftType('karintou');
    setWishLevel(2);
  };

  const handleStartEdit = (availability: Availability) => {
    setEditingId(availability.id);
    setEditStartTime(availability.startTime);
    setEditEndTime(availability.endTime);
    setEditShiftType(availability.shiftType);
    setEditWishLevel(availability.wishLevel ?? 2);
  };

  const handleSaveEdit = (availabilityId: string) => {
    onEditAvailability(availabilityId, editStartTime, editEndTime, editShiftType, editWishLevel);
    setEditingId(null);
    if (autoEditId) onClose();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStartTime('');
    setEditEndTime('');
    if (autoEditId) onClose();
  };

  const currentAvailabilities = availabilities.filter(
    (availability) =>
      availability.employeeId === employee.id &&
      availability.date.toDateString() === date.toDateString()
  );

  const statusLabels = {
    pending: { text: '承認待ち', icon: Clock },
    approved: { text: '承認済み', icon: CheckCircle },
    rejected: { text: '却下', icon: XCircle },
  };

  const statusColors = {
    pending: 'bg-yellow-50 border-yellow-300 text-yellow-900',
    approved: 'bg-green-50 border-green-300 text-green-900',
    rejected: 'bg-red-50 border-red-300 text-red-900',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 border border-indigo-100 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {mode === 'add' ? '勤務希望を追加' : '登録済みシフトの管理'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
          <p className="text-indigo-600 text-sm mb-1">従業員</p>
          <p className="text-gray-800 font-semibold">{employee.name}</p>
          <p className="text-indigo-500 text-sm">{employee.role}</p>
        </div>

        <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
          <p className="text-purple-600 text-sm mb-1">日付</p>
          <p className="text-gray-800 font-semibold">{format(date, 'yyyy年M月d日 (E)', { locale: ja })}</p>
        </div>

        {mode === 'manage' && currentAvailabilities.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">この日の登録済みシフトはありません</p>
        )}

        {mode === 'add' && (
        <>
        <div className="mb-6">
          <p className="text-gray-700 mb-3 font-medium">勤務可能時間を入力</p>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-gray-700">開始時間</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-700">終了時間</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-700">シフトタイプ</label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as 'karintou' | 'cafe')}
                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
              >
                {Object.entries(shiftTypeConfig).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-gray-700">希望レベル</label>
              <div className="flex gap-2">
                {[3, 2, 1].map(level => {
                  const cfg = wishLevelConfig[level];
                  const isSelected = wishLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setWishLevel(level)}
                      className={`flex-1 py-2.5 px-2 rounded-xl border-2 text-xs font-bold transition-all duration-200 hover:scale-105 ${
                        isSelected
                          ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}
                    >
                      <div className="text-base leading-none mb-1">{cfg.badge}</div>
                      <div>{cfg.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

          <button
            onClick={handleAddAvailability}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 mb-4 shadow-md"
          >
            勤務希望を追加
          </button>
        </>
        )}

        {mode === 'manage' && currentAvailabilities.length > 0 && (
          <div>
            <p className="text-gray-700 mb-3 font-medium">登録済み勤務希望</p>
            {!currentUser.isManager ? (
              <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-sm text-blue-800 space-y-1 border border-blue-200 shadow-sm">
                <p>※ 勤務希望の承認・却下は管理者のみが行えます</p>
                <p>※ 承認待ちの勤務希望のみ編集・削除が可能です</p>
              </div>
            ) : (
              <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl text-sm text-purple-800 space-y-1 border border-purple-200 shadow-sm">
                <p>※ 管理者は全てのシフトを編集・削除できます</p>
              </div>
            )}
            <div className="space-y-3">
              {currentAvailabilities.map((availability) => {
                // 編集：マネージャーは全員分・スタッフは自分の承認待ちのみ
                const canEdit = currentUser.isManager || (availability.status === 'pending' && availability.employeeId === currentUser.id);
                // 削除：登録者本人のみ・スタッフは承認済み以外のみ削除可能
                const canDelete = availability.employeeId === currentUser.id &&
                  (currentUser.isManager || availability.status !== 'approved');

                return (
                  <div
                    key={availability.id}
                    className={`p-4 rounded-xl border ${statusColors[availability.status]} transition-all duration-200 hover:shadow-md`}
                  >
                    {editingId === availability.id ? (
                      <div>
                        <p className="text-sm font-semibold mb-3 text-gray-800">勤務希望を編集</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs mb-1 text-gray-700">開始時間</label>
                            <input
                              type="time"
                              value={editStartTime}
                              onChange={(e) => setEditStartTime(e.target.value)}
                              className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1 text-gray-700">終了時間</label>
                            <input
                              type="time"
                              value={editEndTime}
                              onChange={(e) => setEditEndTime(e.target.value)}
                              className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1 text-gray-700">シフトタイプ</label>
                            <div className="flex gap-2">
                              {Object.entries(shiftTypeConfig).map(([key, val]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setEditShiftType(key as 'karintou' | 'cafe')}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                    editShiftType === key ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 bg-white'
                                  }`}
                                  style={editShiftType === key ? { backgroundColor: val.color } : {}}
                                >
                                  {key === 'karintou' ? '◉' : '◆'} {val.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs mb-1 text-gray-700">希望レベル</label>
                            <div className="flex gap-2">
                              {[3, 2, 1].map(level => {
                                const cfg = wishLevelConfig[level];
                                const isSelected = editWishLevel === level;
                                return (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => setEditWishLevel(level)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                                      isSelected ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}` : 'bg-white text-gray-400 border-gray-200'
                                    }`}
                                  >
                                    <div className="text-sm leading-none">{cfg.badge}</div>
                                    <div>{cfg.label}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(availability.id)}
                              className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1 text-sm hover:scale-105"
                            >
                              <Save className="w-3 h-3" />
                              保存
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 text-sm hover:scale-105"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {(() => {
                                const StatusIcon = statusLabels[availability.status].icon;
                                return <StatusIcon className="w-3.5 h-3.5" />;
                              })()}
                              <span className="text-sm font-semibold">
                                {availability.shiftType === 'karintou' ? '◉' : '◆'}
                              </span>
                              <span className="text-sm font-semibold">{statusLabels[availability.status].text}</span>
                            </div>
                            <span
                              className="text-xs px-2 py-1 rounded-md font-medium"
                              style={{
                                backgroundColor: shiftTypeConfig[availability.shiftType].bgColor,
                                color: shiftTypeConfig[availability.shiftType].color,
                                border: `1px solid ${shiftTypeConfig[availability.shiftType].borderColor}`,
                              }}
                            >
                              {shiftTypeConfig[availability.shiftType].label}
                            </span>
                          </div>
                          {availability.status === 'pending' && currentUser.isManager && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => onApprove(availability.id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-1 hover:scale-105"
                              >
                                <Check className="w-4 h-4" />
                                承認
                              </button>
                              <button
                                onClick={() => onReject(availability.id)}
                                className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-1 hover:scale-105"
                              >
                                <XCircle className="w-4 h-4" />
                                却下
                              </button>
                            </div>
                          )}
                          {availability.status === 'approved' && currentUser.isManager && (
                            <button
                              onClick={() => onReject(availability.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-1 hover:scale-105"
                            >
                              <XCircle className="w-4 h-4" />
                              却下に変更
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <p className="text-sm font-medium">
                              {availability.startTime} - {availability.endTime}
                            </p>
                            {(() => {
                              const level = availability.wishLevel ?? 2;
                              const cfg = wishLevelConfig[level];
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                                  {cfg.badge} {cfg.label}
                                </span>
                              );
                            })()}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleStartEdit(availability)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                                title="編集"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => onRemoveAvailability(availability.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-all duration-200 hover:scale-110"
                                  title="削除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}