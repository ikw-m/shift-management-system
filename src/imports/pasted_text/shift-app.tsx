import { useState } from 'react';
import { addWeeks } from 'date-fns';
import { LogOut } from 'lucide-react';
import { EmployeeList } from './components/EmployeeList';
import { ShiftCalendar } from './components/ShiftCalendar';
import { ShiftDialog } from './components/ShiftDialog';
import { AddEmployeeDialog } from './components/AddEmployeeDialog';
import { EditEmployeeDialog } from './components/EditEmployeeDialog';
import { ConfirmedShiftTable } from './components/ConfirmedShiftTable';
import { LoginDialog } from './components/LoginDialog';
import { Employee, Availability } from './types';

const employeeColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([
    { id: '1', name: '田中 花子', role: 'マネージャー', color: '#3b82f6', password: 'manager', isManager: true },
    { id: '2', name: '佐藤 太郎', role: 'スタッフ', color: '#22c55e', password: 'staff', isManager: false },
    { id: '3', name: '鈴木 美咲', role: 'スタッフ', color: '#a855f7', password: 'staff', isManager: false },
    { id: '4', name: '高橋 健一', role: 'スタッフ', color: '#f59e0b', password: 'staff', isManager: false },
  ]);

  const [availabilities, setAvailabilities] = useState<Availability[]>([
    {
      id: '1',
      employeeId: '1',
      date: new Date(2026, 2, 16),
      startTime: '08:00',
      endTime: '17:00',
      status: 'approved',
    },
    {
      id: '2',
      employeeId: '2',
      date: new Date(2026, 2, 16),
      startTime: '09:00',
      endTime: '18:00',
      status: 'approved',
    },
    {
      id: '3',
      employeeId: '2',
      date: new Date(2026, 2, 18),
      startTime: '08:00',
      endTime: '17:00',
      status: 'pending',
    },
    {
      id: '4',
      employeeId: '3',
      date: new Date(2026, 2, 16),
      startTime: '09:00',
      endTime: '18:00',
      status: 'pending',
    },
    {
      id: '5',
      employeeId: '4',
      date: new Date(2026, 2, 17),
      startTime: '08:00',
      endTime: '17:00',
      status: 'approved',
    },
  ]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [editEmployeeDialogOpen, setEditEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'confirmed'>('calendar');

  const handleCellClick = (employeeId: string, date: Date) => {
    if (!currentUser) return;

    // マネージャー以外は自分以外の勤務を追加できない
    if (!currentUser.isManager && employeeId !== currentUser.id) {
      return;
    }

    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      setSelectedDate(date);
      setShiftDialogOpen(true);
    }
  };

  const handleAddAvailability = (availability: Omit<Availability, 'id' | 'status'>) => {
    const newAvailability: Availability = {
      ...availability,
      id: Date.now().toString(),
      status: 'pending',
    };
    setAvailabilities([...availabilities, newAvailability]);
  };

  const handleRemoveAvailability = (availabilityId: string) => {
    setAvailabilities(availabilities.filter((a) => a.id !== availabilityId));
  };

  const handleEditAvailability = (availabilityId: string, startTime: string, endTime: string) => {
    setAvailabilities(
      availabilities.map((a) =>
        a.id === availabilityId ? { ...a, startTime, endTime } : a
      )
    );
  };

  const handleApproveAvailability = (availabilityId: string) => {
    setAvailabilities(
      availabilities.map((a) =>
        a.id === availabilityId ? { ...a, status: 'approved' as const } : a
      )
    );
  };

  const handleRejectAvailability = (availabilityId: string) => {
    setAvailabilities(
      availabilities.map((a) =>
        a.id === availabilityId ? { ...a, status: 'rejected' as const } : a
      )
    );
  };

  const handleAddEmployee = (name: string, role: string, password: string) => {
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name,
      role,
      color: employeeColors[employees.length % employeeColors.length],
      password,
      isManager: role === 'マネージャー',
    };
    setEmployees([...employees, newEmployee]);
    setAddEmployeeDialogOpen(false);
  };

  const handleEditEmployee = (id: string, name: string, role: string, password: string) => {
    setEmployees(
      employees.map((employee) =>
        employee.id === id
          ? { ...employee, name, role, password, isManager: role === 'マネージャー' }
          : employee
      )
    );
    setEditEmployeeDialogOpen(false);
  };

  const handleOpenEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditEmployeeDialogOpen(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleRemoveEmployee = (id: string) => {
    setEmployees(employees.filter((e) => e.id !== id));
    setAvailabilities(availabilities.filter((a) => a.employeeId !== id));
  };

  if (!currentUser) {
    return <LoginDialog employees={employees} onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">シフト管理システム</h1>
              <p className="text-muted-foreground mt-2">
                従業員の勤務希望を管理・承認できます
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm ${
                  viewMode === 'calendar'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50 scale-105'
                    : 'bg-white text-gray-700 hover:shadow-md hover:scale-105'
                }`}
              >
                カレンダー
              </button>
              <button
                onClick={() => setViewMode('confirmed')}
                className={`px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm ${
                  viewMode === 'confirmed'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50 scale-105'
                    : 'bg-white text-gray-700 hover:shadow-md hover:scale-105'
                }`}
              >
                シフト確定票
              </button>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-lg border border-white/50">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shadow-md"
                style={{ backgroundColor: currentUser.color }}
              />
              <span className="text-gray-800">
                {currentUser.name} ({currentUser.role})
                {currentUser.isManager && (
                  <span className="ml-3 text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1.5 rounded-full shadow-sm">
                    管理者権限
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </header>

        {viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <EmployeeList
                employees={employees}
                currentUser={currentUser}
                onAddEmployee={() => setAddEmployeeDialogOpen(true)}
                onEditEmployee={handleOpenEditDialog}
                onRemoveEmployee={handleRemoveEmployee}
              />
            </div>

            <div className="lg:col-span-3">
              <ShiftCalendar
                currentDate={currentDate}
                employees={employees}
                availabilities={availabilities}
                currentUser={currentUser}
                onPreviousWeek={() => setCurrentDate(addWeeks(currentDate, -1))}
                onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
                onCellClick={handleCellClick}
                onApprove={handleApproveAvailability}
                onReject={handleRejectAvailability}
              />
            </div>
          </div>
        ) : (
          <ConfirmedShiftTable
            currentDate={currentDate}
            employees={employees}
            availabilities={availabilities.filter((a) => a.status === 'approved')}
            onPreviousWeek={() => setCurrentDate(addWeeks(currentDate, -1))}
            onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
          />
        )}

        <ShiftDialog
          isOpen={shiftDialogOpen}
          onClose={() => setShiftDialogOpen(false)}
          employee={selectedEmployee}
          date={selectedDate}
          availabilities={availabilities}
          currentUser={currentUser}
          onAddAvailability={handleAddAvailability}
          onEditAvailability={handleEditAvailability}
          onRemoveAvailability={handleRemoveAvailability}
          onApprove={handleApproveAvailability}
          onReject={handleRejectAvailability}
        />

        <AddEmployeeDialog
          isOpen={addEmployeeDialogOpen}
          onClose={() => setAddEmployeeDialogOpen(false)}
          onAdd={handleAddEmployee}
        />

        <EditEmployeeDialog
          isOpen={editEmployeeDialogOpen}
          onClose={() => setEditEmployeeDialogOpen(false)}
          employee={editingEmployee}
          onEdit={handleEditEmployee}
        />
      </div>
    </div>
  );
}