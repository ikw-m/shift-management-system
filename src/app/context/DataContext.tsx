import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee, Availability, ShiftCondition, Department, ProcedureTemplate } from '../types';
import { supabase } from '../../lib/supabase';

interface DataContextType {
  departments: Department[];
  employees: Employee[];
  availabilities: Availability[];
  addDepartment: (name: string) => Promise<string>;
  updateDepartment: (id: string, name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
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
  getDailyNotesForMonth: (year: number, month: number, departmentId?: string) => Promise<{ [date: string]: string }>;
  saveDailyNote: (date: string, note: string, departmentId?: string) => Promise<void>;
  getMonthlyProcedure: (year: number, month: number, departmentId?: string) => Promise<[string, string, string]>;
  saveMonthlyProcedure: (year: number, month: number, procedures: [string, string, string], departmentId?: string) => Promise<void>;
  getProcedureTemplates: (departmentId?: string) => Promise<ProcedureTemplate[]>;
  addProcedureTemplate: (content: string, departmentId?: string) => Promise<void>;
  deleteProcedureTemplate: (id: string) => Promise<void>;
  getShiftCondition: (year: number, departmentId?: string) => Promise<ShiftCondition | null>;
  saveShiftCondition: (year: number, condition: ShiftCondition, departmentId?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabaseからデータを取得 + availabilitiesリアルタイム購読
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('availabilities-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availabilities' }, async () => {
        const { data } = await supabase.from('availabilities').select('*').order('date');
        if (data) {
          setAvailabilities(data.map(a => ({
            id: a.id,
            employeeId: a.employee_id,
            date: a.date,
            startTime: a.start_time,
            endTime: a.end_time,
            status: a.status,
            shiftType: a.shift_type || 'karintou',
            wishLevel: a.wish_level ?? 2,
            isPaidLeave: a.is_paid_leave ?? false,
            submittedAt: a.submitted_at,
            reviewedAt: a.reviewed_at,
            reviewedBy: a.reviewed_by
          })));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        defaultStartTime: emp.default_start_time ?? undefined,
        defaultEndTime: emp.default_end_time ?? undefined,
        defaultShiftType: emp.default_shift_type ?? undefined,
        defaultDays: emp.default_days ?? undefined,
        defaultWishLevel: emp.default_wish_level ?? undefined,
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
        isPaidLeave: a.is_paid_leave ?? false,
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
        default_start_time: employee.defaultStartTime ?? null,
        default_end_time: employee.defaultEndTime ?? null,
        default_shift_type: employee.defaultShiftType ?? null,
        default_days: employee.defaultDays ?? null,
        default_wish_level: employee.defaultWishLevel ?? null,
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
          defaultStartTime: data.default_start_time ?? undefined,
          defaultEndTime: data.default_end_time ?? undefined,
          defaultShiftType: data.default_shift_type ?? undefined,
          defaultDays: data.default_days ?? undefined,
          defaultWishLevel: data.default_wish_level ?? undefined,
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
        default_start_time: employee.defaultStartTime ?? null,
        default_end_time: employee.defaultEndTime ?? null,
        default_shift_type: employee.defaultShiftType ?? null,
        default_days: employee.defaultDays ?? null,
        default_wish_level: employee.defaultWishLevel ?? null,
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
        defaultStartTime: employee.defaultStartTime,
        defaultEndTime: employee.defaultEndTime,
        defaultShiftType: employee.defaultShiftType,
        defaultDays: employee.defaultDays,
        defaultWishLevel: employee.defaultWishLevel,
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
        is_paid_leave: availability.isPaidLeave ?? false,
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
        setAvailabilities(prev => [...prev, {
          id: data.id,
          employeeId: data.employee_id,
          date: data.date,
          startTime: data.start_time,
          endTime: data.end_time,
          shiftType: data.shift_type || 'karintou',
          wishLevel: data.wish_level ?? 2,
          isPaidLeave: data.is_paid_leave ?? false,
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
        is_paid_leave: availability.isPaidLeave ?? false,
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
      setAvailabilities(prev => prev.map(a => a.id === id ? {
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
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${pad(month)}-${pad(lastDay)}`;
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

  const getMonthlyProcedure = async (year: number, month: number, departmentId?: string): Promise<[string, string, string]> => {
    try {
      let query = supabase.from('monthly_procedures').select('procedure1, procedure2, procedure3').eq('year', year).eq('month', month);
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return [data?.procedure1 || '', data?.procedure2 || '', data?.procedure3 || ''];
    } catch {
      return ['', '', ''];
    }
  };

  const saveMonthlyProcedure = async (year: number, month: number, procedures: [string, string, string], departmentId?: string): Promise<void> => {
    try {
      const [procedure1, procedure2, procedure3] = procedures;
      let checkQuery = supabase.from('monthly_procedures').select('year').eq('year', year).eq('month', month);
      if (departmentId) checkQuery = checkQuery.eq('department_id', departmentId);
      const { data: existing } = await checkQuery.maybeSingle();

      if (existing) {
        let updateQuery = supabase.from('monthly_procedures').update({ procedure1, procedure2, procedure3 }).eq('year', year).eq('month', month);
        if (departmentId) updateQuery = updateQuery.eq('department_id', departmentId);
        const { error } = await updateQuery;
        if (error) throw error;
      } else {
        const record: Record<string, unknown> = { year, month, procedure1, procedure2, procedure3 };
        if (departmentId) record.department_id = departmentId;
        const { error } = await supabase.from('monthly_procedures').insert(record);
        if (error) throw error;
      }
    } catch (error) {
      throw error;
    }
  };

  const getProcedureTemplates = async (departmentId?: string): Promise<ProcedureTemplate[]> => {
    try {
      let query = supabase.from('procedure_templates').select('*').order('created_at', { ascending: true });
      if (departmentId) query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProcedureTemplate[];
    } catch {
      return [];
    }
  };

  const addProcedureTemplate = async (content: string, departmentId?: string): Promise<void> => {
    try {
      const record: Record<string, unknown> = { content };
      if (departmentId) record.department_id = departmentId;
      const { error } = await supabase.from('procedure_templates').insert(record);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const deleteProcedureTemplate = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('procedure_templates').delete().eq('id', id);
      if (error) throw error;
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
    let checkQuery = supabase.from('shift_conditions').select('id').eq('year', year);
    if (departmentId) checkQuery = checkQuery.eq('department_id', departmentId);
    const { data: existing } = await checkQuery.maybeSingle();

    if (existing) {
      const { error } = await supabase.from('shift_conditions').update({ data: condition }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const record: Record<string, unknown> = { year, data: condition };
      if (departmentId) record.department_id = departmentId;
      const { error } = await supabase.from('shift_conditions').insert(record);
      if (error) throw error;
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
        getDailyNotesForMonth,
        saveDailyNote,
        getMonthlyProcedure,
        saveMonthlyProcedure,
        getProcedureTemplates,
        addProcedureTemplate,
        deleteProcedureTemplate,
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
    return {
      departments: [], employees: [], availabilities: [], loading: false,
      reloadData: async () => {},
      addDepartment: async () => '',
      updateDepartment: async () => {}, deleteDepartment: async () => {},
      reorderDepartments: async () => {}, reorderEmployees: async () => {},
      addEmployee: async () => {}, updateEmployee: async () => {},
      updateEmployeeOrder: async () => {}, deleteEmployee: async () => {},
      addAvailability: async () => {}, updateAvailability: async () => {},
      deleteAvailability: async () => {}, approveAvailability: async () => {},
      rejectAvailability: async () => {},
      getDailyNotesForMonth: async () => ({}),
      saveDailyNote: async () => {},
      getMonthlyProcedure: async () => ['', '', ''] as [string, string, string],
      saveMonthlyProcedure: async () => {},
      getProcedureTemplates: async () => [],
      addProcedureTemplate: async () => {},
      deleteProcedureTemplate: async () => {},
      getShiftCondition: async () => null,
      saveShiftCondition: async () => {},
    } as DataContextType;
  }
  return context;
}