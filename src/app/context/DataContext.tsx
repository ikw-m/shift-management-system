import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee, Availability, ShiftCondition, Department } from '../types';
import { supabase } from '../../lib/supabase';

interface DataContextType {
  departments: Department[];
  employees: Employee[];
  availabilities: Availability[];
  addDepartment: (name: string) => Promise<string>;
  updateDepartment: (id: string, name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  updateDepartmentOrder: (id: string, displayOrder: number) => Promise<void>;
  reorderDepartments: (ordered: { id: string }[]) => Promise<void>;
  reorderEmployees: (ordered: { id: string }[]) => Promise<void>;
  loading: boolean;
  reloadData: () => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployeeOrder: (id: string, displayOrder: number) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addAvailability: (availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => Promise<void>;
  updateAvailability: (id: string, availability: Omit<Availability, 'id' | 'status' | 'submittedAt'>) => Promise<void>;
  deleteAvailability: (id: string) => Promise<void>;
  approveAvailability: (id: string, reviewerName: string) => Promise<void>;
  rejectAvailability: (id: string, reviewerName: string) => Promise<void>;
  getDailyNote: (date: string, departmentId?: string) => Promise<string>;
  getDailyNotesForMonth: (year: number, month: number, departmentId?: string) => Promise<{ [date: string]: string }>;
  saveDailyNote: (date: string, note: string, departmentId?: string) => Promise<void>;
  getMonthlyProcedure: (year: number, month: number, departmentId?: string) => Promise<string>;
  saveMonthlyProcedure: (year: number, month: number, procedure: string, departmentId?: string) => Promise<void>;
  getShiftCondition: (year: number, departmentId?: string) => Promise<ShiftCondition | null>;
  saveShiftCondition: (year: number, condition: ShiftCondition, departmentId?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabaseからデータを取得
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 店舗データを取得
      const { data: deptsData, error: deptsError } = await supabase
        .from('departments')
        .select('*')
        .order('display_order');
      if (deptsError) throw deptsError;
      setDepartments(deptsData?.map(d => ({
        id: d.id,
        departmentName: d.department_name,
        displayOrder: d.display_order ?? 0,
      })) || []);

      // 従業員データを取得
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('display_order');

      if (employeesError) throw employeesError;

      // display_order を displayOrder に変換
      const processedEmployees = employeesData?.map(emp => ({
        ...emp,
        displayOrder: emp.display_order ?? 0,
        departmentId: emp.department_id ?? undefined,
      })) || [];

      setEmployees(processedEmployees);

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
        wishLevel: a.wish_level ?? 2,
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

  const addDepartment = async (name: string): Promise<string> => {
    const maxOrder = Math.max(...departments.map(d => d.displayOrder), -1);
    const { data, error } = await supabase
      .from('departments')
      .insert([{ department_name: name, display_order: maxOrder + 1 }])
      .select().single();
    if (error) throw error;
    if (data) setDepartments([...departments, { id: data.id, departmentName: data.department_name, displayOrder: data.display_order }]);
    return data?.id ?? '';
  };

  const updateDepartment = async (id: string, name: string) => {
    const { error } = await supabase.from('departments').update({ department_name: name }).eq('id', id);
    if (error) throw error;
    setDepartments(departments.map(d => d.id === id ? { ...d, departmentName: name } : d));
  };

  const deleteDepartment = async (id: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
    setDepartments(departments.filter(d => d.id !== id));
  };

  const updateDepartmentOrder = async (id: string, displayOrder: number) => {
    const { error } = await supabase.from('departments').update({ display_order: displayOrder }).eq('id', id);
    if (error) throw error;
    setDepartments(departments.map(d => d.id === id ? { ...d, displayOrder } : d));
  };

  const reorderDepartments = async (ordered: { id: string }[]) => {
    await Promise.all(ordered.map((d, i) =>
      supabase.from('departments').update({ display_order: i }).eq('id', d.id)
    ));
    setDepartments(prev => {
      const map = new Map(prev.map(d => [d.id, d]));
      return ordered.map((o, i) => ({ ...map.get(o.id)!, displayOrder: i }));
    });
  };

  const reorderEmployees = async (ordered: { id: string }[]) => {
    await Promise.all(ordered.map((e, i) =>
      supabase.from('employees').update({ display_order: i }).eq('id', e.id)
    ));
    setEmployees(prev => {
      const map = new Map(prev.map(e => [e.id, e]));
      return prev.map(e => {
        const idx = ordered.findIndex(o => o.id === e.id);
        return idx !== -1 ? { ...map.get(e.id)!, displayOrder: idx } : e;
      });
    });
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
        display_order: employee.displayOrder ?? 0,
        department_id: employee.departmentId ?? null,
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setEmployees([...employees, {
          ...data,
          displayOrder: data.display_order ?? 0,
          departmentId: data.department_id ?? undefined,
        }]);
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
        display_order: employee.displayOrder ?? 0,
        department_id: employee.departmentId ?? null,
      };

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setEmployees(prev => prev.map(e => e.id === id ? {
        ...e,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        role: employee.role,
        password: employee.password,
        color: employee.color,
        displayOrder: employee.displayOrder ?? e.displayOrder,
        departmentId: employee.departmentId,
      } : e));
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
      // 先にシフトデータ（availabilities）を削除
      const { error: availError } = await supabase
        .from('availabilities')
        .delete()
        .eq('employee_id', id);
      if (availError) throw availError;

      // 従業員を削除
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEmployees(employees.filter(emp => emp.id !== id));
      setAvailabilities(availabilities.filter(availability => availability.employeeId !== id));
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
        wish_level: availability.wishLevel ?? 2,
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
          wishLevel: data.wish_level ?? 2,
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
        wish_level: availability.wishLevel ?? 2,
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

  const getDailyNotesForMonth = async (year: number, month: number, departmentId?: string): Promise<{ [date: string]: string }> => {
    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const from = `${year}-${pad(month)}-01`;
      const to = `${year}-${pad(month)}-31`;
      let query = supabase.from('daily_notes').select('date, note').gte('date', from).lte('date', to);
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) throw error;
      const result: { [date: string]: string } = {};
      (data || []).forEach(row => { if (row.note) result[row.date] = row.note; });
      return result;
    } catch {
      return {};
    }
  };

  const getDailyNote = async (date: string, departmentId?: string): Promise<string> => {
    try {
      let query = supabase.from('daily_notes').select('note').eq('date', date);
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.note || '';
    } catch (error) {
      return '';
    }
  };

  const saveDailyNote = async (date: string, note: string, departmentId?: string): Promise<void> => {
    try {
      let checkQuery = supabase.from('daily_notes').select('date').eq('date', date);
      if (departmentId) checkQuery = checkQuery.eq('department_id', departmentId);
      const { data: existing } = await checkQuery.maybeSingle();

      if (existing) {
        let updateQuery = supabase.from('daily_notes').update({ note }).eq('date', date);
        if (departmentId) updateQuery = updateQuery.eq('department_id', departmentId);
        const { error } = await updateQuery;
        if (error) throw error;
      } else {
        const record: Record<string, unknown> = { date, note };
        if (departmentId) record.department_id = departmentId;
        const { error } = await supabase.from('daily_notes').insert(record);
        if (error) throw error;
      }
    } catch (error) {
      throw error;
    }
  };

  const getMonthlyProcedure = async (year: number, month: number, departmentId?: string): Promise<string> => {
    try {
      let query = supabase.from('monthly_procedures').select('procedure').eq('year', year).eq('month', month);
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.procedure || '';
    } catch (error) {
      return '';
    }
  };

  const saveMonthlyProcedure = async (year: number, month: number, procedure: string, departmentId?: string): Promise<void> => {
    try {
      let checkQuery = supabase.from('monthly_procedures').select('year').eq('year', year).eq('month', month);
      if (departmentId) checkQuery = checkQuery.eq('department_id', departmentId);
      const { data: existing } = await checkQuery.maybeSingle();

      if (existing) {
        let updateQuery = supabase.from('monthly_procedures').update({ procedure }).eq('year', year).eq('month', month);
        if (departmentId) updateQuery = updateQuery.eq('department_id', departmentId);
        const { error } = await updateQuery;
        if (error) throw error;
      } else {
        const record: Record<string, unknown> = { year, month, procedure };
        if (departmentId) record.department_id = departmentId;
        const { error } = await supabase.from('monthly_procedures').insert(record);
        if (error) throw error;
      }
    } catch (error) {
      throw error;
    }
  };

  const getShiftCondition = async (year: number, departmentId?: string): Promise<ShiftCondition | null> => {
    try {
      let query = supabase
        .from('shift_conditions')
        .select('data')
        .eq('year', year);
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.data || null;
    } catch (error) {
      return null;
    }
  };

  const saveShiftCondition = async (year: number, condition: ShiftCondition, departmentId?: string): Promise<void> => {
    let checkQuery = supabase.from('shift_conditions').select('year').eq('year', year);
    if (departmentId) checkQuery = checkQuery.eq('department_id', departmentId);
    const { data: existing, error: checkError } = await checkQuery.maybeSingle();

    if (checkError) {
      console.error('[saveShiftCondition] check error:', checkError);
      throw new Error(`確認エラー: ${checkError.message} (${checkError.code})`);
    }

    if (existing) {
      let updateQuery = supabase.from('shift_conditions').update({ data: condition }).eq('year', year);
      if (departmentId) updateQuery = updateQuery.eq('department_id', departmentId);
      const { error } = await updateQuery;
      if (error) {
        console.error('[saveShiftCondition] update error:', error);
        throw new Error(`更新エラー: ${error.message} (${error.code})`);
      }
    } else {
      const record: Record<string, unknown> = { year, data: condition };
      if (departmentId) record.department_id = departmentId;
      console.log('[saveShiftCondition] inserting:', record);
      const { error } = await supabase.from('shift_conditions').insert(record);
      if (error) {
        console.error('[saveShiftCondition] insert error:', error);
        throw new Error(`挿入エラー: ${error.message} (${error.code})`);
      }
    }
  };

  return (
    <DataContext.Provider
      value={{
        departments,
        employees,
        availabilities,
        loading,
        reloadData: loadData,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        updateDepartmentOrder,
        reorderDepartments,
        reorderEmployees,
        addEmployee,
        updateEmployee,
        updateEmployeeOrder,
        deleteEmployee,
        addAvailability,
        updateAvailability,
        deleteAvailability,
        approveAvailability,
        rejectAvailability,
        getDailyNote,
        getDailyNotesForMonth,
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