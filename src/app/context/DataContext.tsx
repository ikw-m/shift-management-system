import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee, Shift, Availability } from '../types';

interface DataContextType {
  employees: Employee[];
  shifts: Shift[];
  availabilities: Availability[];
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, employee: Omit<Employee, 'id'>) => void;
  deleteEmployee: (id: string) => void;
  addShift: (shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => void;
  updateShift: (id: string, shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => void;
  deleteShift: (id: string) => void;
  approveShift: (id: string, reviewerName: string) => void;
  rejectShift: (id: string, reviewerName: string) => void;
  addAvailability: (availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => void;
  updateAvailability: (id: string, availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => void;
  deleteAvailability: (id: string) => void;
  approveAvailability: (id: string, reviewerName: string) => void;
  rejectAvailability: (id: string, reviewerName: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_EMPLOYEES = 'shift-management-employees';
const STORAGE_KEY_SHIFTS = 'shift-management-shifts';
const STORAGE_KEY_AVAILABILITIES = 'shift-management-availabilities';

// 初期データ
const initialEmployees: Employee[] = [
  {
    id: '1',
    name: '田中 太郎',
    email: 'tanaka@example.com',
    phone: '090-1234-5678',
    position: 'マネージャー',
    role: 'manager',
    password: 'password123',
    color: '#3b82f6',
  },
  {
    id: '2',
    name: '佐藤 花子',
    email: 'sato@example.com',
    phone: '090-2345-6789',
    position: 'スタッフ',
    role: 'staff',
    password: 'password123',
    color: '#10b981',
  },
  {
    id: '3',
    name: '鈴木 次郎',
    email: 'suzuki@example.com',
    phone: '090-3456-7890',
    position: 'スタッフ',
    role: 'staff',
    password: 'password123',
    color: '#f59e0b',
  },
];

const initialShifts: Shift[] = [
  {
    id: '1',
    employeeId: '1',
    date: '2026-03-25',
    startTime: '09:00',
    endTime: '17:00',
    notes: '通常勤務',
    status: 'pending',
    submittedAt: '2026-03-24T10:00:00Z',
  },
  {
    id: '2',
    employeeId: '2',
    date: '2026-03-25',
    startTime: '10:00',
    endTime: '18:00',
    notes: '',
    status: 'approved',
    submittedAt: '2026-03-24T10:00:00Z',
    reviewedAt: '2026-03-24T11:00:00Z',
    reviewedBy: '田中 太郎',
  },
  {
    id: '3',
    employeeId: '3',
    date: '2026-03-26',
    startTime: '14:00',
    endTime: '22:00',
    notes: '夜勤シフト',
    status: 'pending',
    submittedAt: '2026-03-24T10:00:00Z',
  },
];

const initialAvailabilities: Availability[] = [
  {
    id: '1',
    employeeId: '1',
    date: '2026-03-25',
    startTime: '09:00',
    endTime: '17:00',
    status: 'pending',
    submittedAt: '2026-03-24T10:00:00Z',
  },
  {
    id: '2',
    employeeId: '2',
    date: '2026-03-25',
    startTime: '10:00',
    endTime: '18:00',
    status: 'pending',
    submittedAt: '2026-03-24T10:00:00Z',
  },
  {
    id: '3',
    employeeId: '3',
    date: '2026-03-26',
    startTime: '14:00',
    endTime: '22:00',
    status: 'pending',
    submittedAt: '2026-03-24T10:00:00Z',
  },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 既存データにroleとpasswordがない場合は初期データを使用
        const hasRequiredFields = parsed.every((emp: Employee) => emp.role && emp.password);
        if (!hasRequiredFields) {
          console.log('Migrating old employee data to new format...');
          localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(initialEmployees));
          return initialEmployees;
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse employees from localStorage:', e);
        return initialEmployees;
      }
    }
    return initialEmployees;
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_SHIFTS);
    return stored ? JSON.parse(stored) : initialShifts;
  });

  const [availabilities, setAvailabilities] = useState<Availability[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_AVAILABILITIES);
    return stored ? JSON.parse(stored) : initialAvailabilities;
  });

  // localStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AVAILABILITIES, JSON.stringify(availabilities));
  }, [availabilities]);

  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: Date.now().toString(),
    };
    setEmployees([...employees, newEmployee]);
  };

  const updateEmployee = (id: string, employee: Omit<Employee, 'id'>) => {
    setEmployees(employees.map(emp => emp.id === id ? { ...employee, id } : emp));
  };

  const deleteEmployee = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id));
    // 従業員を削除する際、関連するシフトも削除
    setShifts(shifts.filter(shift => shift.employeeId !== id));
    // 従業員を削除する際、関連する利用可能時間も削除
    setAvailabilities(availabilities.filter(availability => availability.employeeId !== id));
  };

  const addShift = (shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => {
    const newShift: Shift = {
      ...shift,
      id: Date.now().toString(),
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    setShifts([...shifts, newShift]);
  };

  const updateShift = (id: string, shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => {
    setShifts(shifts.map(s => s.id === id ? { ...shift, id } : s));
  };

  const deleteShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
  };

  const approveShift = (id: string, reviewerName: string) => {
    setShifts(shifts.map(s => s.id === id ? { ...s, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy: reviewerName } : s));
  };

  const rejectShift = (id: string, reviewerName: string) => {
    setShifts(shifts.map(s => s.id === id ? { ...s, status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewedBy: reviewerName } : s));
  };

  const addAvailability = (availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => {
    const newAvailability: Availability = {
      ...availability,
      id: Date.now().toString(),
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    setAvailabilities([...availabilities, newAvailability]);
  };

  const updateAvailability = (id: string, availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => {
    setAvailabilities(availabilities.map(a => {
      if (a.id === id) {
        return { ...a, ...availability };
      }
      return a;
    }));
  };

  const deleteAvailability = (id: string) => {
    setAvailabilities(availabilities.filter(a => a.id !== id));
  };

  const approveAvailability = (id: string, reviewerName: string) => {
    setAvailabilities(availabilities.map(a => a.id === id ? { ...a, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy: reviewerName } : a));
  };

  const rejectAvailability = (id: string, reviewerName: string) => {
    setAvailabilities(availabilities.map(a => a.id === id ? { ...a, status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewedBy: reviewerName } : a));
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        shifts,
        availabilities,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addShift,
        updateShift,
        deleteShift,
        approveShift,
        rejectShift,
        addAvailability,
        updateAvailability,
        deleteAvailability,
        approveAvailability,
        rejectAvailability,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}