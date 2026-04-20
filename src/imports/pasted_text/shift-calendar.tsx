import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Check, X } from 'lucide-react';
import { Employee, Availability } from '../types';

interface ShiftCalendarProps {
  currentDate: Date;
  employees: Employee[];
  availabilities: Availability[];
  currentUser: Employee;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCellClick: (employeeId: string, date: Date) => void;
  onApprove: (availabilityId: string) => void;
  onReject: (availabilityId: string) => void;
}

export function ShiftCalendar({
  currentDate,
  employees,
  availabilities,
  currentUser,
  onPreviousWeek,
  onNextWeek,
  onCellClick,
  onApprove,
  onReject,
}: ShiftCalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAvailabilitiesForEmployeeAndDate = (employeeId: string, date: Date) => {
    return availabilities.filter(
      (availability) => availability.employeeId === employeeId && isSameDay(availability.date, date)
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-gray-800">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          シフト表
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={onPreviousWeek}
            className="p-2.5 hover:bg-indigo-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
          >
            <ChevronLeft className="w-5 h-5 text-indigo-600" />
          </button>
          <span className="min-w-[200px] text-center font-medium text-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-xl">
            {format(weekStart, 'yyyy年M月d日', { locale: ja })} -{' '}
            {format(addDays(weekStart, 6), 'M月d日', { locale: ja })}
          </span>
          <button
            onClick={onNextWeek}
            className="p-2.5 hover:bg-indigo-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
          >
            <ChevronRight className="w-5 h-5 text-indigo-600" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-4 border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 min-w-[120px] first:rounded-tl-xl">従業員</th>
              {weekDays.map((day, index) => (
                <th
                  key={day.toISOString()}
                  className={`p-4 border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 min-w-[120px] ${
                    index === weekDays.length - 1 ? 'rounded-tr-xl' : ''
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{format(day, 'M/d', { locale: ja })}</div>
                    <div className="text-sm text-indigo-600">
                      {format(day, 'E', { locale: ja })}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="p-4 border border-indigo-100 bg-white/60">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-md"
                      style={{ backgroundColor: employee.color }}
                    />
                    <span className="font-medium text-gray-700">{employee.name}</span>
                  </div>
                </td>
                {weekDays.map((day) => {
                  const dayAvailabilities = getAvailabilitiesForEmployeeAndDate(employee.id, day);
                  return (
                    <td
                      key={`${employee.id}-${day.toISOString()}`}
                      className="p-2 border border-indigo-100 align-top bg-white/40"
                    >
                      <div className="space-y-2">
                        {dayAvailabilities.map((availability) => {
                          const statusColors = {
                            pending: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 text-amber-900 shadow-sm',
                            approved: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 text-emerald-900 shadow-sm',
                            rejected: 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-300 text-rose-900 shadow-sm',
                          };
                          const statusLabels = {
                            pending: '承認待ち',
                            approved: '承認済み',
                            rejected: '却下',
                          };
                          return (
                            <div
                              key={availability.id}
                              className={`px-2 py-2 rounded-lg text-xs border ${statusColors[availability.status]} transition-all duration-200 hover:shadow-md`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold">{statusLabels[availability.status]}</span>
                                {availability.status === 'pending' && currentUser.isManager && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onApprove(availability.id);
                                      }}
                                      className="p-1 hover:bg-emerald-200 rounded-md transition-all duration-200 hover:scale-110"
                                      title="承認"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onReject(availability.id);
                                      }}
                                      className="p-1 hover:bg-rose-200 rounded-md transition-all duration-200 hover:scale-110"
                                      title="却下"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                {availability.status === 'approved' && currentUser.isManager && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReject(availability.id);
                                    }}
                                    className="p-1 hover:bg-rose-200 rounded-md transition-all duration-200 hover:scale-110"
                                    title="却下に変更"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="text-center font-medium">
                                {availability.startTime} - {availability.endTime}
                              </div>
                            </div>
                          );
                        })}
                        {(currentUser.isManager || currentUser.id === employee.id) && (
                          <button
                            onClick={() => onCellClick(employee.id, day)}
                            className="w-full px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 border border-dashed border-indigo-200 hover:border-indigo-400 hover:shadow-sm"
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

      <div className="mt-6 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2 rounded-lg border border-amber-200">
          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-300 shadow-sm" />
          <span className="text-sm font-medium text-amber-900">承認待ち</span>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-2 rounded-lg border border-emerald-200">
          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-100 to-green-100 border border-emerald-300 shadow-sm" />
          <span className="text-sm font-medium text-emerald-900">承認済み</span>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-rose-50 to-red-50 px-3 py-2 rounded-lg border border-rose-200">
          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-rose-100 to-red-100 border border-rose-300 shadow-sm" />
          <span className="text-sm font-medium text-rose-900">却下</span>
        </div>
      </div>

      {!currentUser.isManager && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl space-y-1 border border-blue-200 shadow-sm">
          <p className="text-sm text-blue-800">
            ※ 勤務希望の承認・却下は管理者権限を持つ従業員のみが行えます
          </p>
          <p className="text-sm text-blue-800">
            ※ スタッフは自分の承認待ち勤務希望のみ編集・削除できます
          </p>
        </div>
      )}
      {currentUser.isManager && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl space-y-1 border border-purple-200 shadow-sm">
          <p className="text-sm text-purple-800">
            ※ マネージャーは承認済みの勤務データを却下に変更できます
          </p>
        </div>
      )}
    </div>
  );
}
