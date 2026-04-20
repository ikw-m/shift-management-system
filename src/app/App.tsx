import { useState, useEffect } from 'react';
import { getMonth, getYear } from 'date-fns';
import { LogOut } from 'lucide-react';
import { EmployeeList } from './components/EmployeeList';
import { ShiftCalendar } from './components/ShiftCalendar';
import { ShiftDialog } from './components/ShiftDialog';
import { AddEmployeeDialog } from './components/AddEmployeeDialog';
import { EditEmployeeDialog } from './components/EditEmployeeDialog';
import { ConfirmedShiftTable } from './components/ConfirmedShiftTable';
import { LoginDialog } from './components/LoginDialog';
import { ShiftConditionSettings } from './components/ShiftConditionSettings';
import { Employee, Availability } from './types';

const employeeColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

// デフォルトの従業員データ
const defaultEmployees: Employee[] = [
  { id: '1', name: '田中 花子', role: 'マネージャー', color: '#3b82f6', password: 'manager', isManager: true, displayOrder: 0 },
  { id: '2', name: '佐藤 太郎', role: 'スタッフ', color: '#22c55e', password: 'staff', isManager: false, displayOrder: 1 },
  { id: '3', name: '鈴木 美咲', role: 'スタッフ', color: '#a855f7', password: 'staff', isManager: false, displayOrder: 2 },
  { id: '4', name: '高橋 健一', role: 'スタッフ', color: '#f59e0b', password: 'staff', isManager: false, displayOrder: 3 },
  { id: '5', name: '伊藤 愛子', role: 'スタッフ', color: '#ef4444', password: 'staff', isManager: false, displayOrder: 4 },
  { id: '6', name: '渡辺 直樹', role: 'スタッフ', color: '#f97316', password: 'staff', isManager: false, displayOrder: 5 },
  { id: '7', name: '山本 由美', role: 'スタッフ', color: '#84cc16', password: 'staff', isManager: false, displayOrder: 6 },
  { id: '8', name: '中村 誠', role: 'スタッフ', color: '#14b8a6', password: 'staff', isManager: false, displayOrder: 7 },
  { id: '9', name: '小林 優子', role: 'スタッフ', color: '#06b6d4', password: 'staff', isManager: false, displayOrder: 8 },
  { id: '10', name: '加藤 大輔', role: 'スタッフ', color: '#6366f1', password: 'staff', isManager: false, displayOrder: 9 },
  { id: '11', name: '吉田 麻衣', role: 'スタッフ', color: '#8b5cf6', password: 'staff', isManager: false, displayOrder: 10 },
  { id: '12', name: '山田 修', role: 'スタッフ', color: '#d946ef', password: 'staff', isManager: false, displayOrder: 11 },
  { id: '13', name: '佐々木 結衣', role: 'スタッフ', color: '#ec4899', password: 'staff', isManager: false, displayOrder: 12 },
  { id: '14', name: '松本 拓也', role: 'スタッフ', color: '#f43f5e', password: 'staff', isManager: false, displayOrder: 13 },
  { id: '15', name: '井上 さくら', role: 'スタッフ', color: '#06b6d4', password: 'staff', isManager: false, displayOrder: 14 },
  { id: '16', name: '木村 浩二', role: 'スタッフ', color: '#8b5cf6', password: 'staff', isManager: false, displayOrder: 15 },
  { id: '17', name: '林 香織', role: 'スタッフ', color: '#22c55e', password: 'staff', isManager: false, displayOrder: 16 },
  { id: '18', name: '斉藤 勇太', role: 'スタッフ', color: '#f59e0b', password: 'staff', isManager: false, displayOrder: 17 },
];

// デフォルトのシフトデータ
const defaultAvailabilities: Availability[] = [
  {
    id: '1',
    employeeId: '1',
    date: new Date(2026, 3, 2),
    startTime: '08:00',
    endTime: '17:00',
    status: 'approved',
    shiftType: 'karintou',
  },
  {
    id: '2',
    employeeId: '2',
    date: new Date(2026, 3, 2),
    startTime: '09:00',
    endTime: '18:00',
    status: 'approved',
    shiftType: 'cafe',
  },
  {
    id: '3',
    employeeId: '2',
    date: new Date(2026, 3, 3),
    startTime: '08:00',
    endTime: '17:00',
    status: 'pending',
    shiftType: 'karintou',
  },
  {
    id: '4',
    employeeId: '3',
    date: new Date(2026, 3, 2),
    startTime: '09:00',
    endTime: '18:00',
    status: 'pending',
    shiftType: 'cafe',
  },
  {
    id: '5',
    employeeId: '4',
    date: new Date(2026, 3, 3),
    startTime: '08:00',
    endTime: '17:00',
    status: 'approved',
    shiftType: 'karintou',
  },
];

// localStorageからデータを読み込む
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      // localStorageにデータがない場合のみデフォルト値を保存
      saveToLocalStorage(key, defaultValue);
      return defaultValue;
    }

    const parsed = JSON.parse(item);

    // Availabilityの場合、dateをDateオブジェクトに変換し、shiftTypeのデフォルト値を設定
    if (key === 'shift_management_availabilities' && Array.isArray(parsed)) {
      return parsed.map((availability: any) => ({
        ...availability,
        date: new Date(availability.date),
        shiftType: availability.shiftType || 'karintou', // デフォルト値を設定
      })) as T;
    }

    // Employeeの場合、displayOrderがない場合は自動的に割り当て
    if (key === 'shift_management_employees' && Array.isArray(parsed)) {
      const employeesWithOrder = parsed.map((employee: any, index: number) => ({
        ...employee,
        displayOrder: typeof employee.displayOrder === 'number' ? employee.displayOrder : index,
      }));

      // displayOrderが重複していないか確認し、重複している場合は再割り当て
      const orderSet = new Set(employeesWithOrder.map((e: any) => e.displayOrder));
      if (orderSet.size !== employeesWithOrder.length) {
        return employeesWithOrder.map((employee: any, index: number) => ({
          ...employee,
          displayOrder: index,
        })) as T;
      }

      return employeesWithOrder as T;
    }

    return parsed;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// localStorageにデータを保存する
const saveToLocalStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const loadedEmployees = loadFromLocalStorage('shift_management_employees', defaultEmployees);
    // displayOrderが未設定の従業員がいる場合は初期化
    const hasUndefinedOrder = loadedEmployees.some((emp) => emp.displayOrder === undefined);
    if (hasUndefinedOrder) {
      return loadedEmployees.map((emp, index) => ({
        ...emp,
        displayOrder: emp.displayOrder !== undefined ? emp.displayOrder : index,
      }));
    }
    return loadedEmployees;
  });

  const [availabilities, setAvailabilities] = useState<Availability[]>(() =>
    loadFromLocalStorage('shift_management_availabilities', defaultAvailabilities)
  );

  // 従業員データが変更されたらlocalStorageに保存
  useEffect(() => {
    saveToLocalStorage('shift_management_employees', employees);
  }, [employees]);

  // シフトデータが変更されたらlocalStorageに保存
  useEffect(() => {
    saveToLocalStorage('shift_management_availabilities', availabilities);
  }, [availabilities]);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(getYear(now));
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now) + 1);
  const [selectedHalf, setSelectedHalf] = useState<'first' | 'second'>('first');
  const [confirmedYear, setConfirmedYear] = useState(getYear(now));
  const [confirmedMonth, setConfirmedMonth] = useState(getMonth(now) + 1);
  const [confirmedHalf, setConfirmedHalf] = useState<'first' | 'second'>('first');
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [editEmployeeDialogOpen, setEditEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'confirmed' | 'employees' | 'shiftCondition'>('calendar');

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
    const maxOrder = Math.max(...employees.map((e) => e.displayOrder ?? 0), -1);
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name,
      role,
      color: employeeColors[employees.length % employeeColors.length],
      password,
      isManager: role === 'マネージャー',
      displayOrder: maxOrder + 1,
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
    const employeeToRemove = employees.find((e) => e.id === id);
    if (!employeeToRemove) return;

    // 削除確認
    const confirmMessage = `${employeeToRemove.name} を削除してもよろしいですか？\nこの従業員に関連するすべてのシフトデータも削除されます。`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // 最後のマネージャーは削除できない
    if (employeeToRemove.isManager) {
      const otherManagers = employees.filter((e) => e.id !== id && e.isManager);
      if (otherManagers.length === 0) {
        alert('システムには最低1人のマネージャーが必要です。\n他のマネージャーを追加してから削除してください。');
        return;
      }
    }

    setEmployees(employees.filter((e) => e.id !== id));
    setAvailabilities(availabilities.filter((a) => a.employeeId !== id));
  };

  const handleMoveEmployee = (id: string, direction: 'up' | 'down') => {
    const sortedEmployees = [...employees].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const currentIndex = sortedEmployees.findIndex((e) => e.id === id);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedEmployees.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentEmployee = sortedEmployees[currentIndex];
    const swapEmployee = sortedEmployees[newIndex];

    const currentOrder = currentEmployee.displayOrder ?? currentIndex;
    const swapOrder = swapEmployee.displayOrder ?? newIndex;

    const updatedEmployees = employees.map((emp) => {
      if (emp.id === currentEmployee.id) {
        return { ...emp, displayOrder: swapOrder };
      }
      if (emp.id === swapEmployee.id) {
        return { ...emp, displayOrder: currentOrder };
      }
      return emp;
    });

    setEmployees(updatedEmployees);
  };

  if (!currentUser) {
    return <LoginDialog employees={employees} onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
      {/* ヘッダーを独立したコンテナに */}
      <div className="max-w-7xl mx-auto mb-6">
        <header>
          <div className="flex items-center justify-between mb-4 h-[44px]">
            {/* 左側：システム名 - 固定幅 */}
            <div className="w-[320px]">
              <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">シフト管理システム</h1>
            </div>
            
            {/* 右側：コンパクトなヘッダー - flexで右寄せ */}
            <div className="flex items-center gap-2">
              {/* 従業員情報とログアウトボタンを統合したバナー */}
              <div className="flex items-center gap-3 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-white/60 h-[40px]">
                {/* 従業員情報 */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: currentUser.color }}
                  />
                  <span className="text-xs font-medium text-gray-900 whitespace-nowrap">{currentUser.name}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-600 whitespace-nowrap">{currentUser.role}</span>
                  {currentUser.isManager && (
                    <span className="ml-1 text-[9px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                      管理者
                    </span>
                  )}
                </div>
                
                {/* 区切り線 */}
                <div className="w-px h-5 bg-gray-200 flex-shrink-0"></div>
                
                {/* ログアウトボタン */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2 py-1 text-gray-700 hover:text-red-600 rounded-lg transition-all duration-200 hover:bg-red-50 flex-shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium whitespace-nowrap">ログアウト</span>
                </button>
              </div>
              
              {/* ナビゲーションボタン */}
              <div className="flex gap-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-1.5 rounded-xl shadow-sm border border-white/60 h-[40px] items-center">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 whitespace-nowrap h-[28px] flex items-center ${
                    viewMode === 'calendar'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  シフト管理入力
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
                {currentUser.isManager && (
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
                )}
              </div>
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm ml-1 h-5 leading-5">
            従業員の勤務希望を管理・承認できます
          </p>
        </header>
      </div>

      {/* コンテンツエリア - 各ビューで異なる幅を持つ */}
      <div className={viewMode === 'employees' ? 'max-w-2xl mx-auto' : viewMode === 'shiftCondition' ? 'max-w-7xl mx-auto' : 'max-w-7xl mx-auto'}>
        {viewMode === 'calendar' ? (
          <ShiftCalendar
            year={selectedYear}
            month={selectedMonth}
            half={selectedHalf}
            employees={employees}
            availabilities={availabilities}
            currentUser={currentUser}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
            onHalfChange={setSelectedHalf}
            onCellClick={handleCellClick}
            onApprove={handleApproveAvailability}
            onReject={handleRejectAvailability}
            onRemoveAvailability={handleRemoveAvailability}
          />
        ) : viewMode === 'confirmed' ? (
          <ConfirmedShiftTable
            year={confirmedYear}
            month={confirmedMonth}
            half={confirmedHalf}
            employees={employees}
            availabilities={availabilities.filter((a) => a.status === 'approved')}
            onYearChange={setConfirmedYear}
            onMonthChange={setConfirmedMonth}
            onHalfChange={setConfirmedHalf}
          />
        ) : viewMode === 'shiftCondition' ? (
          <ShiftConditionSettings />
        ) : (
          <EmployeeList
            employees={employees}
            currentUser={currentUser}
            onAddEmployee={() => setAddEmployeeDialogOpen(true)}
            onEditEmployee={handleOpenEditDialog}
            onRemoveEmployee={handleRemoveEmployee}
            onMoveEmployee={handleMoveEmployee}
          />
        )}
      </div>

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
        employees={employees}
        onEdit={handleEditEmployee}
      />
    </div>
  );
}