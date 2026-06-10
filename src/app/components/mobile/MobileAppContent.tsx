import { LogOut } from 'lucide-react';
import { Employee, Availability } from '../../types';
import { MobileShiftManager } from './MobileShiftManager';

interface MobileAppContentProps {
  currentUser: Employee;
  employees: Employee[];
  availabilities: Availability[];
  onLogout: () => void;
  onAddAvailability: (a: Omit<Availability, 'id' | 'status'>) => void;
  onEditAvailability: (id: string, startTime: string, endTime: string) => void;
  onRemoveAvailability: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MobileAppContent({
  currentUser,
  employees,
  availabilities,
  onLogout,
  onAddAvailability,
  onEditAvailability,
  onRemoveAvailability,
  onApprove,
  onReject,
}: MobileAppContentProps) {
  const isManager = currentUser.role === 'manager' || currentUser.isManager === true;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 no-print flex-shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: currentUser.color }}
          />
          <span className="font-semibold text-gray-800 text-sm">{currentUser.name}</span>
          {isManager && (
            <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full">
              管理者
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Ver. 3.0</span>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-gray-100 active:bg-gray-200"
          >
            <LogOut className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* メインコンテンツ（統合シフト管理画面） */}
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
