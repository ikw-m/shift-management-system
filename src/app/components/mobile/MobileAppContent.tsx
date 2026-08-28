import { useState } from 'react';
import { Employee, Availability } from '../../types';
import { MobileShiftManager } from './MobileShiftManager';
import { MobileManagerNav } from './MobileManagerNav';
import { MobileStaffNav } from './MobileStaffNav';
import { MobileEmployeeList } from './MobileEmployeeList';
import { MobileShiftConditionSettings } from './MobileShiftConditionSettings';

interface MobileAppContentProps {
  currentUser: Employee;
  employees: Employee[];
  availabilities: Availability[];
  departmentName: string;
  onLogout: () => void;
  onAddAvailability: (a: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (id: string, startTime: string, endTime: string, shiftType: 'karintou' | 'cafe', wishLevel: number, isPaidLeave?: boolean) => void;
  onRemoveAvailability: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MobileAppContent({
  currentUser,
  employees,
  availabilities,
  departmentName,
  onLogout,
  onAddAvailability,
  onEditAvailability,
  onRemoveAvailability,
  onApprove,
  onReject,
}: MobileAppContentProps) {
  const isManager = currentUser.role === 'manager' || currentUser.isManager === true;
  const [screen, setScreen] = useState<'nav' | 'staffNav' | 'shift' | 'employees' | 'shiftCondition'>(
    isManager ? 'nav' : 'staffNav'
  );

  // 管理者ナビ画面
  if (screen === 'nav') {
    return (
      <MobileManagerNav
        currentUser={currentUser}
        departmentName={departmentName}
        onNavigate={setScreen}
        onLogout={onLogout}
      />
    );
  }

  // スタッフナビ画面
  if (screen === 'staffNav') {
    return (
      <MobileStaffNav
        currentUser={currentUser}
        departmentName={departmentName}
        onNavigate={setScreen}
        onLogout={onLogout}
      />
    );
  }

  // 従業員リスト画面
  if (screen === 'employees') {
    return (
      <MobileEmployeeList
        currentUser={currentUser}
        departmentName={departmentName}
        onBack={() => setScreen('nav')}
        onLogout={onLogout}
      />
    );
  }

  // シフト条件設定画面
  if (screen === 'shiftCondition') {
    return (
      <MobileShiftConditionSettings
        currentUser={currentUser}
        departmentName={departmentName}
        onBack={() => setScreen('nav')}
        onLogout={onLogout}
      />
    );
  }

  // シフト管理画面
  return (
    <MobileShiftManager
      currentUser={currentUser}
      employees={employees}
      availabilities={availabilities}
      departmentName={departmentName}
      onBack={() => setScreen(isManager ? 'nav' : 'staffNav')}
      onAddAvailability={onAddAvailability}
      onEditAvailability={onEditAvailability}
      onRemoveAvailability={onRemoveAvailability}
      onApprove={onApprove}
      onReject={onReject}
    />
  );
}
