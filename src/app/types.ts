export interface Department {
  id: string;
  departmentName: string;
  displayOrder: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  role: 'manager' | 'staff';
  password: string;
  color: string;
  departmentId?: string;
  created_at?: string;
  // 互換性のため
  isManager?: boolean;
  displayOrder?: number;
  // テンプレート用デフォルト値
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultShiftType?: 'karintou' | 'cafe';
  defaultDays?: string[];
  defaultWishLevel?: number;
}


export interface Availability {
  id: string;
  employeeId: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
  shiftType: 'karintou' | 'cafe';
  wishLevel?: number;
  isPaidLeave?: boolean;
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export const wishLevelConfig: Record<number, { label: string; badge: string; textColor: string; bgColor: string; borderColor: string }> = {
  3: { label: '是非お願い',   badge: '●●●', textColor: 'text-red-600',   bgColor: 'bg-red-50',   borderColor: 'border-red-300' },
  2: { label: 'お任せします', badge: '●●○', textColor: 'text-blue-600',  bgColor: 'bg-blue-50',  borderColor: 'border-blue-300' },
  1: { label: '人数不足なら', badge: '●○○', textColor: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
};

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