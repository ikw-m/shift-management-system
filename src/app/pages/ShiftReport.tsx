import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar, Clock, FileCheck, CheckCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export function ShiftReport() {
  const { employees, availabilities } = useData();

  // 承認済みの勤務可能時間のみを取得
  const approvedShifts = availabilities
    .filter(availability => availability.status === 'approved')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 日付ごとにグループ化
  const shiftsByDate = approvedShifts.reduce((acc, shift) => {
    if (!acc[shift.date]) {
      acc[shift.date] = [];
    }
    acc[shift.date].push(shift);
    return acc;
  }, {} as Record<string, typeof approvedShifts>);

  const dates = Object.keys(shiftsByDate).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">シフト確定票</h2>
          <p className="text-gray-600 text-sm mt-1">
            承認済みのシフトを確認できます
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
        >
          <FileCheck className="w-4 h-4 mr-2" />
          印刷
        </Button>
      </div>

      {approvedShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-500">
              承認済みのシフトがありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* サマリー */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">承認済みシフト数</p>
                    <p className="text-3xl font-semibold">{approvedShifts.length}</p>
                  </div>
                  <div className="bg-green-100 text-green-600 p-3 rounded-full">
                    <FileCheck className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">稼働従業員数</p>
                    <p className="text-3xl font-semibold">
                      {new Set(approvedShifts.map(s => s.employeeId)).size}
                    </p>
                  </div>
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">対象日数</p>
                    <p className="text-3xl font-semibold">{dates.length}</p>
                  </div>
                  <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 日付別のシフト一覧 */}
          <div className="space-y-4">
            {dates.map(date => {
              const dayShifts = shiftsByDate[date];
              return (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {format(parseISO(date), 'yyyy年M月d日 (E)', { locale: ja })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dayShifts.map(shift => {
                        const employee = employees.find(emp => emp.id === shift.employeeId);
                        if (!employee) return null;

                        return (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                                style={{ backgroundColor: employee.color }}
                              >
                                {employee.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{employee.name}</p>
                                  <Badge variant="outline">{employee.position}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {shift.startTime} - {shift.endTime}
                                  </div>
                                  {shift.reviewedBy && (
                                    <span className="text-xs">
                                      承認者: {shift.reviewedBy}
                                    </span>
                                  )}
                                </div>
                                {shift.notes && (
                                  <p className="text-sm text-gray-600 mt-1">{shift.notes}</p>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" />
                              <span>{shift.shiftType === 'karintou' ? '◉' : '◆'}</span>
                              承認済み
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 従業員別サマリー */}
          <Card>
            <CardHeader>
              <CardTitle>従業員別シフトサマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employees.map(employee => {
                  const employeeShifts = approvedShifts.filter(
                    shift => shift.employeeId === employee.id
                  );

                  if (employeeShifts.length === 0) return null;

                  return (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: employee.color }}
                        >
                          {employee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.position}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{employeeShifts.length}日</p>
                        <p className="text-sm text-gray-600">シフト確定</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}