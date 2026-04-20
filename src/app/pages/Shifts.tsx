import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Check, X, Clock } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import { Shift } from '../types';

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function Shifts() {
  const { employees, shifts, addShift, approveShift, rejectShift, deleteShift } = useData();
  const { currentUser, isManager } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
  });

  // 週の日付を生成
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // 前の週へ
  const handlePreviousWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  // 次の週へ
  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  // 特定の日付と従業員のシフトを取得
  const getShiftsForDateAndEmployee = (date: Date, employeeId: string): Shift[] => {
    return shifts.filter(
      shift => shift.employeeId === employeeId && isSameDay(new Date(shift.date), date)
    );
  };

  // シフト追加ダイアログを開く
  const handleOpenDialog = (date: Date, employeeId: string) => {
    setSelectedDate(date);
    setSelectedEmployeeId(employeeId);
    setFormData({
      startTime: '09:00',
      endTime: '17:00',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  // シフトを追加
  const handleAddShift = () => {
    if (!selectedDate || !selectedEmployeeId) return;

    if (formData.startTime >= formData.endTime) {
      toast.error('終了時刻は開始時刻より後にしてください');
      return;
    }

    addShift({
      employeeId: selectedEmployeeId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: formData.startTime,
      endTime: formData.endTime,
      notes: formData.notes,
    });

    toast.success('シフトを追加しました');
    setIsDialogOpen(false);
  };

  // シフトを承認
  const handleApprove = (shiftId: string) => {
    if (!currentUser) return;
    approveShift(shiftId, currentUser.name);
    toast.success('シフトを承認しました');
  };

  // シフトを却下
  const handleReject = (shiftId: string) => {
    if (!currentUser) return;
    rejectShift(shiftId, currentUser.name);
    toast.error('シフトを却下しました');
  };

  // シフトを削除
  const handleDelete = (shiftId: string) => {
    deleteShift(shiftId);
    toast.success('シフトを削除しました');
  };

  // ステータスバッジ
  const getStatusBadge = (status: Shift['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white text-xs">承認済</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white text-xs">却下</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white text-xs">承認待</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              週次シフト管理
            </CardTitle>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handlePreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
                前の週
              </Button>
              <span className="text-lg font-semibold">
                {format(currentWeekStart, 'yyyy年M月d日', { locale: ja })} 〜{' '}
                {format(addDays(currentWeekStart, 6), 'M月d日', { locale: ja })}
              </span>
              <Button variant="outline" onClick={handleNextWeek}>
                次の週
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 p-3 text-left font-semibold min-w-[120px]">
                    従業員
                  </th>
                  {weekDays.map((day, index) => (
                    <th
                      key={day.toISOString()}
                      className="border border-gray-300 bg-gray-100 p-3 text-center font-semibold min-w-[140px]"
                    >
                      <div>{DAYS_OF_WEEK[index]}</div>
                      <div className="text-sm font-normal text-gray-600">
                        {format(day, 'M/d')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="border border-gray-300 p-3 bg-gray-50">
                      <div className="font-semibold">{employee.name}</div>
                      <div className="text-xs text-gray-600">{employee.position}</div>
                    </td>
                    {weekDays.map((day) => {
                      const dayShifts = getShiftsForDateAndEmployee(day, employee.id);
                      return (
                        <td
                          key={`${employee.id}-${day.toISOString()}`}
                          className="border border-gray-300 p-2 align-top"
                        >
                          <div className="space-y-2">
                            {dayShifts.map((shift) => (
                              <div
                                key={shift.id}
                                className="bg-blue-50 border border-blue-200 rounded p-2 text-sm"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold">
                                    {shift.startTime} - {shift.endTime}
                                  </span>
                                  {getStatusBadge(shift.status)}
                                </div>
                                {shift.notes && (
                                  <div className="text-xs text-gray-600 mb-2">{shift.notes}</div>
                                )}
                                {isManager && shift.status === 'pending' && (
                                  <div className="flex gap-1 mt-2">
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-green-600 hover:bg-green-700 h-7 text-xs"
                                      onClick={() => handleApprove(shift.id)}
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      承認
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="flex-1 h-7 text-xs"
                                      onClick={() => handleReject(shift.id)}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      却下
                                    </Button>
                                  </div>
                                )}
                                {shift.status === 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs mt-2"
                                    onClick={() => handleDelete(shift.id)}
                                  >
                                    削除
                                  </Button>
                                )}
                              </div>
                            ))}
                            {/* シフト追加ボタン */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => handleOpenDialog(day, employee.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              追加
                            </Button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* シフト追加ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>シフトを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>従業員</Label>
              <Input
                value={employees.find(e => e.id === selectedEmployeeId)?.name || ''}
                disabled
              />
            </div>
            <div>
              <Label>日付</Label>
              <Input
                value={selectedDate ? format(selectedDate, 'yyyy年M月d日 (E)', { locale: ja }) : ''}
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">開始時刻</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">終了時刻</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="シフトに関する備考を入力"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddShift}>
                追加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
