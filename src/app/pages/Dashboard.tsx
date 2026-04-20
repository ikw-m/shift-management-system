import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Badge } from '../components/ui/badge';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';

export function Dashboard() {
  const { employees, shifts, availabilities } = useData();
  
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // 今週のシフト数を計算
  const thisWeekShifts = shifts.filter(shift => {
    const shiftDate = parseISO(shift.date);
    return isWithinInterval(shiftDate, { start: weekStart, end: weekEnd });
  });

  // 今日のシフト数を計算
  const todayShifts = shifts.filter(shift => shift.date === format(today, 'yyyy-MM-dd'));

  // 承認待ちの勤務可能時間
  const pendingAvailabilities = availabilities.filter(a => a.status === 'pending');

  // 承認済みの勤務可能時間
  const approvedAvailabilities = availabilities.filter(a => a.status === 'approved');

  const stats = [
    {
      title: '総従業員数',
      value: employees.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '今日のシフト',
      value: todayShifts.length,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '承認待ち',
      value: pendingAvailabilities.length,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      link: '/availability',
    },
    {
      title: 'シフト確定数',
      value: approvedAvailabilities.length,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/shift-report',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">ダッシュボード</h2>
        <p className="text-gray-600">
          {format(today, 'yyyy年MM月dd日 (E)', { locale: ja })}
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-semibold">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-full`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                {stat.link && (
                  <Link to={stat.link}>
                    <Button className="mt-2">詳細</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 今日のシフト一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>今日のシフト</CardTitle>
        </CardHeader>
        <CardContent>
          {todayShifts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">今日のシフトはありません</p>
          ) : (
            <div className="space-y-3">
              {todayShifts.map(shift => {
                const employee = employees.find(emp => emp.id === shift.employeeId);
                if (!employee) return null;
                
                return (
                  <div
                    key={shift.id}
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
                      <p className="font-medium">
                        {shift.startTime} - {shift.endTime}
                      </p>
                      {shift.notes && (
                        <p className="text-sm text-gray-600">{shift.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 承認待ちリスト */}
      {pendingAvailabilities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>承認待ちの勤務可能時間</CardTitle>
              <Link to="/availability">
                <Button variant="outline" size="sm">すべて表示</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAvailabilities.slice(0, 5).map(availability => {
                const employee = employees.find(emp => emp.id === availability.employeeId);
                if (!employee) return null;
                
                return (
                  <div
                    key={availability.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200"
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
                        <p className="text-sm text-gray-600">
                          {format(parseISO(availability.date), 'M月d日 (E)', { locale: ja })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {availability.startTime} - {availability.endTime}
                      </p>
                      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                        承認待ち
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}