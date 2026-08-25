import { useState } from 'react';
import { Employee, Availability } from '../../types';
import { MobileShiftManager } from './MobileShiftManager';
import { MobileManagerNav } from './MobileManagerNav';
import { MobileStaffNav } from './MobileStaffNav';
import { MobileEmployeeList } from './MobileEmployeeList';
import { MobileShiftConditionSettings } from './MobileShiftConditionSettings';
import { MobileBulkProcess } from './MobileBulkProcess';

interface MobileAppContentProps {
  currentUser: Employee;
  employees: Employee[];
  availabilities: Availability[];
  departmentName: string;
  onLogout: () => void;
  onAddAvailability: (a: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (id: string, startTime: string, endTime: string, shiftType: 'karintou' | 'cafe', wishLevel: number) => void;
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
  const [screen, setScreen] = useState<'nav' | 'staffNav' | 'bulkProcess' | 'shift' | 'employees' | 'shiftCondition'>(
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

  // 一括処理画面
  if (screen === 'bulkProcess') {
    return (
      <MobileBulkProcess
        currentUser={currentUser}
        departmentName={departmentName}
        onBack={() => setScreen(isManager ? 'nav' : 'staffNav')}
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ヘッダー（固定） */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 no-print flex-shrink-0">
        <div className="px-4 h-9 flex items-center gap-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
            シフト管理システム
          </span>
          <span className="text-gray-500" style={{ fontSize: '0.7em' }}>Ver. 6.0</span>
          {departmentName && (
            <span className="text-xs font-bold text-indigo-700 ml-1">｜ {departmentName}</span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentUser.color }} />
            <span className="font-semibold text-gray-800 text-sm">{currentUser.name}</span>
            <span className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              シフト入力
            </span>
          </div>
          <button
            onClick={() => setScreen(isManager ? 'nav' : 'staffNav')}
            className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 active:bg-indigo-100"
          >
            メニュー
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden">
        <MobileShiftManager
          currentUser={currentUser}
          employees={employees}
          availabilities={availabilities}
          onAddAvailability={onAddAvailability}
          onEditAvailability={onEditAvailability}
          onRemoveAvailability={onRemoveAvailability}
          onApprove={onApprove}
          onReject={onReject}
        />
      </div>
    </div>
  );
}
