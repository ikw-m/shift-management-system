import { useState, useEffect, useRef } from 'react';
import { getMonth, getYear } from 'date-fns';
import { LogOut } from 'lucide-react';
import { EmployeeList, EmployeeListRef } from './EmployeeList';
import { ShiftCalendar, ShiftCalendarRef } from './ShiftCalendar';
import { ShiftDialog } from './ShiftDialog';
import { AddEmployeeDialog } from './AddEmployeeDialog';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { ConfirmedShiftTable } from './ConfirmedShiftTable';
import { LoginDialog } from './LoginDialog';
import { ShiftConditionSettings } from './ShiftConditionSettings';
import { MobileLogin } from './mobile/MobileLogin';
import { MobileAppContent } from './mobile/MobileAppContent';
import { useIsMobile } from '../hooks/useIsMobile';
import { Employee, Availability } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const employeeColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export function AppContent() {
  const { currentUser, logout, login } = useAuth();
  const isMobile = useIsMobile();
  const {
    departments,
    employees,
    availabilities,
    loading,
    reloadData,
    addEmployee,
    updateEmployee,
    updateEmployeeOrder,
    deleteEmployee,
    addAvailability,
    updateAvailability,
    deleteAvailability,
    approveAvailability,
    rejectAvailability,
    reorderEmployees,
  } = useData();

  const employeeListRef = useRef<EmployeeListRef>(null);
  const shiftCalendarRef = useRef<ShiftCalendarRef>(null);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(getYear(now));
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now) + 1);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftDialogMode, setShiftDialogMode] = useState<'add' | 'edit'>('add');
  const [editAvailabilityId, setEditAvailabilityId] = useState<string | undefined>(undefined);
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [editEmployeeDialogOpen, setEditEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'confirmed' | 'employees' | 'shiftCondition'>('calendar');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // ログインユーザーが変更されたときに画面をリセット
  useEffect(() => {
    if (currentUser) {
      const today = new Date();
      setViewMode('calendar');
      setSelectedYear(getYear(today));
      setSelectedMonth(getMonth(today) + 1);
    }
  }, [currentUser?.id]);

  const handleCellClick = (employeeId: string, date: Date) => {
    if (!currentUser) return;
    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      setSelectedDate(date);
      setShiftDialogMode('add');
      setShiftDialogOpen(true);
    }
  };

  const handleEditShift = (employeeId: string, date: Date, availabilityId: string) => {
    if (!currentUser) return;
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      setSelectedDate(date);
      setShiftDialogMode('edit');
      setEditAvailabilityId(availabilityId);
      setShiftDialogOpen(true);
    }
  };

  const handleAddClick = (employeeId: string, date: Date) => {
    if (!currentUser) return;
    const isManager = currentUser.role === 'manager' || currentUser.isManager;
    if (!isManager && employeeId !== currentUser.id) return;
    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      setSelectedDate(date);
      setShiftDialogMode('add');
      setEditAvailabilityId(undefined);
      setShiftDialogOpen(true);
    }
  };

  const handleAddAvailability = async (availability: Omit<Availability, 'id' | 'status'>) => {
    try {
      const scrollTop = shiftCalendarRef.current?.getScrollTop() || 0;
      await addAvailability(availability);
      setTimeout(() => {
        shiftCalendarRef.current?.setScrollTop(scrollTop);
      }, 50);
    } catch (error) {
      alert('シフトの追加に失敗しました');
    }
  };

  const handleRemoveAvailability = async (availabilityId: string) => {
    try {
      const scrollTop = shiftCalendarRef.current?.getScrollTop() || 0;
      await deleteAvailability(availabilityId);
      setTimeout(() => {
        shiftCalendarRef.current?.setScrollTop(scrollTop);
      }, 50);
    } catch (error) {
      alert('シフトの削除に失敗しました');
    }
  };

  const handleEditAvailability = async (
    availabilityId: string,
    startTime: string,
    endTime: string,
    shiftType: 'karintou' | 'cafe',
    wishLevel: number,
    isPaidLeave?: boolean,
  ) => {
    const availability = availabilities.find(a => a.id === availabilityId);
    if (!availability) return;

    try {
      const scrollTop = shiftCalendarRef.current?.getScrollTop() || 0;
      await updateAvailability(availabilityId, {
        employeeId: availability.employeeId,
        date: availability.date,
        startTime,
        endTime,
        shiftType,
        wishLevel,
        isPaidLeave: isPaidLeave ?? availability.isPaidLeave ?? false,
      });
      setTimeout(() => {
        shiftCalendarRef.current?.setScrollTop(scrollTop);
      }, 50);
    } catch (error) {
      alert('シフトの更新に失敗しました');
    }
  };

  const handleBulkAdd = async (items: Array<Omit<Availability, 'id' | 'status'>>) => {
    for (const item of items) {
      await addAvailability(item);
    }
  };

  const handleApproveAvailability = async (availabilityId: string) => {
    if (!currentUser) return;
    try {
      const scrollTop = shiftCalendarRef.current?.getScrollTop() || 0;
      await approveAvailability(availabilityId, currentUser.name);
      setTimeout(() => {
        shiftCalendarRef.current?.setScrollTop(scrollTop);
      }, 50);
    } catch (error) {
      alert('シフトの承認に失敗しました');
    }
  };

  const handleRejectAvailability = async (availabilityId: string) => {
    if (!currentUser) return;
    try {
      const scrollTop = shiftCalendarRef.current?.getScrollTop() || 0;
      await rejectAvailability(availabilityId, currentUser.name);
      setTimeout(() => {
        shiftCalendarRef.current?.setScrollTop(scrollTop);
      }, 50);
    } catch (error) {
      alert('シフトの却下に失敗しました');
    }
  };

  const handleAddEmployee = async (
    name: string,
    position: string,
    isManager: boolean,
    password: string,
    defaultStartTime?: string,
    defaultEndTime?: string,
    defaultShiftType?: 'karintou' | 'cafe',
    defaultDays?: string[],
    defaultWishLevel?: number,
  ) => {
    try {
      const maxOrder = Math.max(...employees.map((e) => e.displayOrder ?? 0), -1);
      await addEmployee({
        name,
        email: `${name.toLowerCase().replace(/\s/g, '')}_${Date.now()}@example.com`,
        phone: '000-0000-0000',
        position,
        role: isManager ? 'manager' : 'staff',
        password,
        color: employeeColors[employees.length % employeeColors.length],
        displayOrder: maxOrder + 1,
        departmentId: currentUser?.departmentId,
        defaultStartTime,
        defaultEndTime,
        defaultShiftType,
        defaultDays,
        defaultWishLevel,
      });
      setAddEmployeeDialogOpen(false);
    } catch (error) {
      alert('従業員の追加に失敗しました');
    }
  };

  const handleEditEmployee = async (
    id: string,
    name: string,
    position: string,
    isManager: boolean,
    password: string,
    defaultStartTime?: string,
    defaultEndTime?: string,
    defaultShiftType?: 'karintou' | 'cafe',
    defaultDays?: string[],
    defaultWishLevel?: number,
  ) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    try {
      await updateEmployee(id, {
        name,
        email: employee.email,
        phone: employee.phone,
        position,
        role: isManager ? 'manager' : 'staff',
        password: password || employee.password,
        color: employee.color,
        displayOrder: employee.displayOrder,
        departmentId: employee.departmentId,
        defaultStartTime: defaultStartTime ?? employee.defaultStartTime,
        defaultEndTime: defaultEndTime ?? employee.defaultEndTime,
        defaultShiftType: defaultShiftType ?? employee.defaultShiftType,
        defaultDays: defaultDays ?? employee.defaultDays,
        defaultWishLevel: defaultWishLevel ?? employee.defaultWishLevel,
      });
      setEditEmployeeDialogOpen(false);
    } catch (error) {
      alert('従業員の更新に失敗しました');
    }
  };

  const handleTemplateEdit = async (
    id: string,
    _name: string,
    _position: string,
    _isManager: boolean,
    password: string,
    defaultStartTime?: string,
    defaultEndTime?: string,
    defaultShiftType?: 'karintou' | 'cafe',
    defaultDays?: string[],
    defaultWishLevel?: number,
  ) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    try {
      await updateEmployee(id, {
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        role: employee.role,
        password: password || employee.password,
        color: employee.color,
        displayOrder: employee.displayOrder,
        departmentId: employee.departmentId,
        defaultStartTime,
        defaultEndTime,
        defaultShiftType,
        defaultDays,
        defaultWishLevel,
      });
      setTemplateDialogOpen(false);
    } catch (error) {
      alert('テンプレートの更新に失敗しました');
    }
  };

  const handleOpenEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditEmployeeDialogOpen(true);
  };

  const handleLogout = () => {
    setViewMode('calendar'); // ログアウト時に画面をリセット
    logout();
  };

  const handleRemoveEmployee = async (id: string) => {
    const employeeToRemove = employees.find((e) => e.id === id);
    if (!employeeToRemove) return;

    // 自分自身は削除できない
    if (employeeToRemove.id === currentUser?.id) {
      alert('自分自身は削除できません。');
      return;
    }

    // 自店舗の最後のマネージャーは削除できない
    const isManager = employeeToRemove.role === 'manager' || employeeToRemove.isManager;
    if (isManager) {
      const sameDeptEmployees = employees.filter(e => e.departmentId === employeeToRemove.departmentId);
      const otherManagers = sameDeptEmployees.filter(e => e.id !== id && (e.role === 'manager' || e.isManager));
      if (otherManagers.length === 0) {
        alert('システムには最低1人のマネージャーが必要です。\n他のマネージャーを追加してから削除してください。');
        return;
      }
    }

    const confirmMessage = `${employeeToRemove.name} を削除してもよろしいですか？\nこの従業員に関連するすべてのシフトデータも削除されます。`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteEmployee(id);
    } catch (error) {
      alert('従業員の削除に失敗しました');
    }
  };

  const handleMoveEmployee = async (id: string, direction: 'up' | 'down') => {
    // 表示中の店舗の従業員のみを対象にソート（表示順と一致させる）
    const deptEmployees = currentUser?.departmentId
      ? [...employees].filter(e => e.departmentId === currentUser.departmentId)
      : [...employees];
    const sorted = deptEmployees.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    const currentIndex = sorted.findIndex((e) => e.id === id);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sorted.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const reordered = [...sorted];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

    try {
      const scrollTop = employeeListRef.current?.getScrollTop() || 0;
      await reorderEmployees(reordered);
      setTimeout(() => {
        employeeListRef.current?.setScrollTop(scrollTop);
      }, 50);
    } catch (error) {
      alert('従業員の並び替えに失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (isMobile) {
      return <MobileLogin employees={employees} departments={departments} onLogin={login} />;
    }
    return <LoginDialog employees={employees} departments={departments} onLogin={login} />;
  }

  // 店舗名を取得
  const currentDepartment = departments.find(d => d.id === currentUser.departmentId);
  const departmentName = currentDepartment?.departmentName ?? '';

  // 同じ店舗の従業員に絞り込み（先に定義）
  const allProcessedEmployees = employees.map(e => ({
    ...e,
    isManager: e.role === 'manager' || e.isManager === true,
  }));
  const processedEmployees = currentUser.departmentId
    ? allProcessedEmployees.filter(e => e.departmentId === currentUser.departmentId)
    : allProcessedEmployees;

  // 自店舗の従業員のシフトデータのみに絞り込む
  const deptEmployeeIds = new Set(processedEmployees.map(e => e.id));
  const processedAvailabilities = availabilities
    .filter(a => deptEmployeeIds.has(a.employeeId))
    .map(a => ({
      ...a,
      date: typeof a.date === 'string' ? new Date(a.date) : a.date,
    }));

  const latestCurrentUser = employees.find(e => e.id === currentUser.id) ?? currentUser;
  const currentUserWithManager = {
    ...latestCurrentUser,
    isManager: latestCurrentUser.role === 'manager' || latestCurrentUser.isManager === true,
  };

  // スマホの場合はモバイルUIを表示
  if (isMobile) {
    return (
      <MobileAppContent
        currentUser={currentUserWithManager}
        employees={processedEmployees}
        availabilities={processedAvailabilities}
        departmentName={departmentName}
        onLogout={logout}
        onAddAvailability={handleAddAvailability}
        onEditAvailability={handleEditAvailability}
        onRemoveAvailability={handleRemoveAvailability}
        onApprove={handleApproveAvailability}
        onReject={handleRejectAvailability}
      />
    );
  }

  return (
    <div className={`${(viewMode === 'calendar' || viewMode === 'confirmed') ? 'h-screen overflow-hidden' : 'min-h-screen'} p-4`} style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
      <div className={(viewMode === 'calendar' || viewMode === 'confirmed') ? 'mb-2' : 'max-w-7xl mx-auto mb-6'}>
        <header>
          <div className="flex items-center justify-between mb-4 h-[44px]">
            <div className="flex items-baseline gap-2">
              <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">シフト管理システム</h1>
              <span className="text-xs text-gray-500">Ver. 7.1</span>
              {departmentName && (
                <span className="text-sm font-bold text-indigo-700 ml-2">｜ {departmentName}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-white/60 h-[40px]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: currentUser.color }}
                  />
                  <span className="text-xs font-medium text-gray-900 whitespace-nowrap">{currentUser.name}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {currentUser.position || (currentUser.role === 'manager' ? 'マネージャー' : 'スタッフ')}
                  </span>
                  {currentUserWithManager.isManager && (
                    <span className="ml-1 text-[9px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                      管理者
                    </span>
                  )}
                </div>

                <div className="w-px h-5 bg-gray-200 flex-shrink-0"></div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2 py-1 text-gray-700 hover:text-red-600 rounded-lg transition-all duration-200 hover:bg-red-50 flex-shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium whitespace-nowrap">ログアウト</span>
                </button>
              </div>

              <div className="flex gap-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-1.5 rounded-xl shadow-sm border border-white/60 h-[40px] items-center">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap h-[28px] flex items-center ${
                    viewMode === 'calendar'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  シフト入力
                </button>
                <button
                  onClick={() => setViewMode('confirmed')}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap h-[28px] flex items-center ${
                    viewMode === 'confirmed'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  シフト確認表
                </button>
                {currentUserWithManager.isManager ? (
                  <>
                    <button
                      onClick={() => setViewMode('employees')}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap h-[28px] flex items-center ${
                        viewMode === 'employees'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      従業員リスト
                    </button>
                    <button
                      onClick={() => setViewMode('shiftCondition')}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap h-[28px] flex items-center ${
                        viewMode === 'shiftCondition'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      シフト条件設定
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setTemplateDialogOpen(true)}
                    className="px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap h-[28px] flex items-center text-gray-600 hover:bg-gray-50"
                  >
                    テンプレート設定
                  </button>
                )}
              </div>
            </div>
          </div>

        </header>
      </div>

      <div className={viewMode === 'employees' ? 'max-w-2xl mx-auto' : (viewMode === 'calendar' || viewMode === 'confirmed') ? '' : 'max-w-7xl mx-auto'}>
        {viewMode === 'calendar' ? (
          <ShiftCalendar
            ref={shiftCalendarRef}
            year={selectedYear}
            month={selectedMonth}
            employees={processedEmployees}
            availabilities={processedAvailabilities}
            currentUser={currentUserWithManager}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
            onCellClick={handleCellClick}
            onAddClick={handleAddClick}
            onEditClick={handleEditShift}
            onApprove={handleApproveAvailability}
            onReject={handleRejectAvailability}
            onRemoveAvailability={handleRemoveAvailability}
            onBulkAdd={handleBulkAdd}
          />
        ) : viewMode === 'confirmed' ? (
          <ConfirmedShiftTable
            year={selectedYear}
            month={selectedMonth}
            employees={processedEmployees}
            availabilities={processedAvailabilities.filter((a) => a.status === 'approved')}
            currentUser={currentUser}
            departmentName={departmentName}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
          />
        ) : viewMode === 'shiftCondition' ? (
          <ShiftConditionSettings departmentId={currentUser?.departmentId} />
        ) : (
          <EmployeeList
            ref={employeeListRef}
            employees={processedEmployees}
            currentUser={currentUserWithManager}
            onAddEmployee={() => setAddEmployeeDialogOpen(true)}
            onEditEmployee={handleOpenEditDialog}
            onRemoveEmployee={handleRemoveEmployee}
            onMoveEmployee={handleMoveEmployee}
          />
        )}
      </div>

      <ShiftDialog
        isOpen={shiftDialogOpen}
        onClose={() => { setShiftDialogOpen(false); setEditAvailabilityId(undefined); }}
        mode={shiftDialogMode}
        editAvailabilityId={editAvailabilityId}
        employee={selectedEmployee}
        date={selectedDate}
        availabilities={processedAvailabilities}
        currentUser={currentUserWithManager}
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
        employees={processedEmployees}
        onEdit={handleEditEmployee}
      />

      <EditEmployeeDialog
        isOpen={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        employee={currentUserWithManager}
        employees={processedEmployees}
        templateMode={true}
        onEdit={handleTemplateEdit}
      />
    </div>
  );
}
