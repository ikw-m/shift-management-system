import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee, Shift, Availability } from '../types';
import { supabase } from '../../lib/supabase';

interface DataContextType {
  employees: Employee[];
  shifts: Shift[];
  availabilities: Availability[];
  loading: boolean;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Omit<Employee, 'id'>) => Promise<void>;
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

      console.log('🔄 Supabaseからデータを読み込み中...');

      // 従業員データを取得
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at');

      if (employeesError) {
        console.error('❌ 従業員データの取得エラー:', employeesError);
        throw employeesError;
      }

      console.log('✅ 従業員データを取得:', employeesData?.length || 0, '人');
      console.log('従業員データ:', employeesData);
      setEmployees(employeesData || []);

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
      console.error('❌ データの読み込みに失敗しました:', error);
      // エラーが発生してもローディングを解除
    } finally {
      setLoading(false);
      console.log('📊 データ読み込み完了');
    }
  };

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setEmployees([...employees, data]);
      }
    } catch (error) {
      console.error('従業員の追加に失敗しました:', error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, employee: Omit<Employee, 'id'>) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update(employee)
        .eq('id', id);
      
      if (error) throw error;
      setEmployees(employees.map(emp => emp.id === id ? { ...employee, id } : emp));
    } catch (error) {
      console.error('従業員の更新に失敗しました:', error);
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
      console.error('従業員の削除に失敗しました:', error);
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
      console.error('シフトの追加に失敗しました:', error);
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
      console.error('シフトの更新に失敗しました:', error);
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
      console.error('シフトの削除に失敗しました:', error);
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
      console.error('シフトの承認に失敗しました:', error);
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
      console.error('シフトの却下に失敗しました:', error);
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
      console.error('利用可能時間の追加に失敗しました:', error);
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
      console.error('利用可能時間の更新に失敗しました:', error);
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
      console.error('利用可能時間の削除に失敗しました:', error);
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
      console.error('利用可能時間の承認に失敗しました:', error);
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
      console.error('利用可能時間の却下に失敗しました:', error);
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