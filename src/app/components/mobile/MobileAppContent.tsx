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
      {/* ヘッダー（固定） */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 no-print flex-shrink-0">
        {/* システム名行 */}
        <div className="px-4 pt-3 pb-1 flex items-baseline gap-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
            シフト管理システム
          </span>
          <span className="text-gray-500" style={{ fontSize: '0.7em' }}>Ver. 3.0</span>
        </div>
        {/* ユーザー情報行 */}
        <div className="flex items-center justify-between px-4 py-2">
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
