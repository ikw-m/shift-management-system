export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  role: 'manager' | 'staff';
  password: string;
  color: string;
  created_at?: string;
  // 互換性のため
  isManager?: boolean;
  displayOrder?: number;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  // 後方互換性
  type?: 'morning' | 'late';
}

export interface Availability {
  id: string;
  employeeId: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
  shiftType: 'karintou' | 'cafe';
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export const shiftTypeConfig = {
  karintou: { label: 'かりんとう', color: '#78350f', bgColor: '#fef3c7', borderColor: '#fcd34d' },
  cafe: { label: 'カフェ', color: '#FFC72C', bgColor: '#fff7ed', borderColor: '#fed7aa' },
};

export type ShiftConditionRowType =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  | 'holiday' | 'springSale' | 'summerSale' | 'winterSale';

export interface ShiftConditionRow {
  type: ShiftConditionRowType;
  requiredStaff: number;
  dates: string[]; // 最大20個の日付（MM/DD形式）
}

export interface ShiftCondition {
  year: number;
  rows: ShiftConditionRow[];
}