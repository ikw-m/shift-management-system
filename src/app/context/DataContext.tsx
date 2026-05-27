import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee, Shift, Availability, ShiftCondition } from '../types';
import { supabase } from '../../lib/supabase';

interface DataContextType {
  employees: Employee[];
  shifts: Shift[];
  availabilities: Availability[];
  loading: boolean;
  reloadData: () => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployeeOrder: (id: string, displayOrder: number) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addShift: (shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => Promise<void>;
  updateShift: (id: string, shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  approveShift: (id: string, reviewerName: string) => Promise<void>;
  rejectShift: (id: string, reviewerName: string) => Promise<void>;
  addAvailability: (availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => Promise<void>;
  updateAvailability: (id: string, availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => Promise<void>;
  deleteAvailability: (id: string) => Promise<void>;
  approveAvailability: (id: string, reviewerName: string) => Promise<void>;
  rejectAvailability: (id: string, reviewerName: string) => Promise<void>;
  getDailyNote: (date: string) => Promise<string>;
  saveDailyNote: (date: string, note: string) => Promise<void>;
  getMonthlyProcedure: (year: number, month: number) => Promise<string>;
  saveMonthlyProcedure: (year: number, month: number, procedure: string) => Promise<void>;
  getShiftCondition: (year: number) => Promise<ShiftCondition | null>;
  saveShiftCondition: (year: number, condition: ShiftCondition) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabaseからデータを取得
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 従業員データを取得
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('display_order');

      if (employeesError) throw employeesError;

      // display_order を displayOrder に変換
      const processedEmployees = employeesData?.map(emp => ({
        ...emp,
        displayOrder: emp.display_order ?? 0
      })) || [];

      setEmployees(processedEmployees);

      // シフトデータを取得
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .order('date');
      
      if (shiftsError) throw shiftsError;
      setShifts(shiftsData?.map(s => ({
        id: s.id,
        employeeId: s.employee_id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        notes: s.notes,
        status: s.status,
        submittedAt: s.submitted_at,
        reviewedAt: s.reviewed_at,
        reviewedBy: s.reviewed_by
      })) || []);

      // 利用可能時間データを取得
      const { data: availabilitiesData, error: availabilitiesError } = await supabase
        .from('availabilities')
        .select('*')
        .order('date');

      if (availabilitiesError) throw availabilitiesError;
      setAvailabilities(availabilitiesData?.map(a => ({
        id: a.id,
        employeeId: a.employee_id,
        date: a.date,
        startTime: a.start_time,
        endTime: a.end_time,
        status: a.status,
        shiftType: a.shift_type || 'karintou',
        submittedAt: a.submitted_at,
        reviewedAt: a.reviewed_at,
        reviewedBy: a.reviewed_by
      })) || []);

    } catch (error) {
      // エラーが発生してもローディングを解除
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      const insertData = {
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        role: employee.role,
        password: employee.password,
        color: employee.color,
        display_order: employee.displayOrder ?? 0
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setEmployees([...employees, { ...data, displayOrder: data.display_order }]);
      }
    } catch (error) {
      throw error;
    }
  };

  const updateEmployee = async (id: string, employee: Omit<Employee, 'id'>) => {
    try {
      const updateData = {
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        role: employee.role,
        password: employee.password,
        color: employee.color,
        display_order: employee.displayOrder ?? 0
      };

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // ローカル状態は更新しない - reloadData()で再取得する
    } catch (error) {
      throw error;
    }
  };

  const updateEmployeeOrder = async (id: string, displayOrder: number) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ display_order: displayOrder })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setEmployees(employees.filter(emp => emp.id !== id));
      setShifts(shifts.filter(shift => shift.employeeId !== id));
      setAvailabilities(availabilities.filter(availability => availability.employeeId !== id));
    } catch (error) {
      throw error;
    }
  };

  const addShift = async (shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => {
    try {
      const newShift = {
        employee_id: shift.employeeId,
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        notes: shift.notes || '',
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('shifts')
        .insert([newShift])
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setShifts([...shifts, {
          id: data.id,
          employeeId: data.employee_id,
          date: data.date,
          startTime: data.start_time,
          endTime: data.end_time,
          notes: data.notes,
          status: data.status,
          submittedAt: data.submitted_at,
          reviewedAt: data.reviewed_at,
          reviewedBy: data.reviewed_by
        }]);
      }
    } catch (error) {
      throw error;
    }
  };

  const updateShift = async (id: string, shift: Omit<Shift, 'id' | 'status' | 'submittedAt'>) => {
    try {
      const updateData = {
        employee_id: shift.employeeId,
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        notes: shift.notes || '',
      };

      const { error } = await supabase
        .from('shifts')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      setShifts(shifts.map(s => s.id === id ? { ...s, ...shift } : s));
    } catch (error) {
      throw error;
    }
  };

  const deleteShift = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setShifts(shifts.filter(s => s.id !== id));
    } catch (error) {
      throw error;
    }
  };

  const approveShift = async (id: string, reviewerName: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerName
        })
        .eq('id', id);
      
      if (error) throw error;
      setShifts(shifts.map(s => s.id === id ? { 
        ...s, 
        status: 'approved' as const, 
        reviewedAt: new Date().toISOString(), 
        reviewedBy: reviewerName 
      } : s));
    } catch (error) {
      throw error;
    }
  };

  const rejectShift = async (id: string, reviewerName: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerName
        })
        .eq('id', id);
      
      if (error) throw error;
      setShifts(shifts.map(s => s.id === id ? { 
        ...s, 
        status: 'rejected' as const, 
        reviewedAt: new Date().toISOString(), 
        reviewedBy: reviewerName 
      } : s));
    } catch (error) {
      throw error;
    }
  };

  const addAvailability = async (availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => {
    try {
      const newAvailability = {
        employee_id: availability.employeeId,
        date: availability.date,
        start_time: availability.startTime,
        end_time: availability.endTime,
        shift_type: availability.shiftType || 'karintou',
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('availabilities')
        .insert([newAvailability])
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setAvailabilities([...availabilities, {
          id: data.id,
          employeeId: data.employee_id,
          date: data.date,
          startTime: data.start_time,
          endTime: data.end_time,
          shiftType: data.shift_type || 'karintou',
          status: data.status,
          submittedAt: data.submitted_at,
          reviewedAt: data.reviewed_at,
          reviewedBy: data.reviewed_by
        }]);
      }
    } catch (error) {
      throw error;
    }
  };

  const updateAvailability = async (id: string, availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => {
    try {
      const updateData = {
        employee_id: availability.employeeId,
        date: availability.date,
        start_time: availability.startTime,
        end_time: availability.endTime,
        shift_type: availability.shiftType || 'karintou',
      };

      const { error } = await supabase
        .from('availabilities')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      setAvailabilities(availabilities.map(a => a.id === id ? { ...a, ...availability } : a));
    } catch (error) {
      throw error;
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setAvailabilities(availabilities.filter(a => a.id !== id));
    } catch (error) {
      throw error;
    }
  };

  const approveAvailability = async (id: string, reviewerName: string) => {
    try {
      const { error } = await supabase
        .from('availabilities')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerName
        })
        .eq('id', id);
      
      if (error) throw error;
      setAvailabilities(availabilities.map(a => a.id === id ? { 
        ...a, 
        status: 'approved' as const, 
        reviewedAt: new Date().toISOString(), 
        reviewedBy: reviewerName 
      } : a));
    } catch (error) {
      throw error;
    }
  };

  const rejectAvailability = async (id: string, reviewerName: string) => {
    try {
      const { error } = await supabase
        .from('availabilities')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerName
        })
        .eq('id', id);

      if (error) throw error;
      setAvailabilities(availabilities.map(a => a.id === id ? {
        ...a,
        status: 'rejected' as const,
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewerName
      } : a));
    } catch (error) {
      throw error;
    }
  };

  const getDailyNote = async (date: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('note')
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.note || '';
    } catch (error) {
      return '';
    }
  };

  const saveDailyNote = async (date: string, note: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('daily_notes')
        .upsert({ date, note }, { onConflict: 'date' });

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const getMonthlyProcedure = async (year: number, month: number): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('monthly_procedures')
        .select('procedure')
        .eq('year', year)
        .eq('month', month)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.procedure || '';
    } catch (error) {
      return '';
    }
  };

  const saveMonthlyProcedure = async (year: number, month: number, procedure: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('monthly_procedures')
        .upsert({ year, month, procedure }, { onConflict: 'year,month' });

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const getShiftCondition = async (year: number): Promise<ShiftCondition | null> => {
    try {
      const { data, error } = await supabase
        .from('shift_conditions')
        .select('data')
        .eq('year', year)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.data || null;
    } catch (error) {
      return null;
    }
  };

  const saveShiftCondition = async (year: number, condition: ShiftCondition): Promise<void> => {
    try {
      const { error } = await supabase
        .from('shift_conditions')
        .upsert({ year, data: condition }, { onConflict: 'year' });

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        shifts,
        availabilities,
        loading,
        reloadData: loadData,
        addEmployee,
        updateEmployee,
        updateEmployeeOrder,
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
        getDailyNote,
        saveDailyNote,
        getMonthlyProcedure,
        saveMonthlyProcedure,
        getShiftCondition,
        saveShiftCondition,
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