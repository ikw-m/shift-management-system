import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileCheck } from 'lucide-react';
import { Employee, Availability } from '../types';

interface ConfirmedShiftTableProps {
  currentDate: Date;
  employees: Employee[];
  availabilities: Availability[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function ConfirmedShiftTable({
  currentDate,
  employees,
  availabilities,
  onPreviousWeek,
  onNextWeek,
}: ConfirmedShiftTableProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getConfirmedShiftsForEmployeeAndDate = (employeeId: string, date: Date) => {
    return availabilities.filter(
      (availability) =>
        availability.employeeId === employeeId &&
        isSameDay(availability.date, date) &&
        availability.status === 'approved'
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-gray-800">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg shadow-lg">
            <FileCheck className="w-5 h-5 text-white" />
          </div>
          シフト確定票
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={onPreviousWeek}
            className="p-2.5 hover:bg-emerald-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
          >
            <ChevronLeft className="w-5 h-5 text-emerald-600" />
          </button>
          <span className="min-w-[200px] text-center font-medium text-gray-700 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 rounded-xl">
            {format(weekStart, 'yyyy年M月d日', { locale: ja })} -{' '}
            {format(addDays(weekStart, 6), 'M月d日', { locale: ja })}
          </span>
          <button
            onClick={onNextWeek}
            className="p-2.5 hover:bg-emerald-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
          >
            <ChevronRight className="w-5 h-5 text-emerald-600" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-4 border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 min-w-[120px] first:rounded-tl-xl">従業員</th>
              {weekDays.map((day, index) => (
                <th
                  key={day.toISOString()}
                  className={`p-4 border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 min-w-[120px] ${
                    index === weekDays.length - 1 ? 'rounded-tr-xl' : ''
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">{format(day, 'M/d', { locale: ja })}</div>
                    <div className="text-sm text-emerald-600">
                      {format(day, 'E', { locale: ja })}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="p-4 border border-emerald-100 bg-white/60">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-md"
                      style={{ backgroundColor: employee.color }}
                    />
                    <div>
                      <div className="font-medium text-gray-700">{employee.name}</div>
                      <div className="text-xs text-emerald-600">{employee.role}</div>
                    </div>
                  </div>
                </td>
                {weekDays.map((day) => {
                  const confirmedShifts = getConfirmedShiftsForEmployeeAndDate(employee.id, day);
                  return (
                    <td
                      key={`${employee.id}-${day.toISOString()}`}
                      className="p-2 border border-emerald-100 align-top bg-white/40"
                    >
                      <div className="space-y-2">
                        {confirmedShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="px-3 py-2 rounded-lg bg-gradient-to-br from-emerald-100 to-green-100 border border-emerald-300 text-emerald-900 text-center shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <div className="font-semibold text-sm">
                              {shift.startTime} - {shift.endTime}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm">
        <p className="text-sm text-emerald-800">
          このシフト確定票には、管理者によって承認された勤務希望のみが表示されています。
        </p>
      </div>
    </div>
  );
}
