import { useState } from 'react';
import { CalendarDays, Settings, LogOut, Zap } from 'lucide-react';
import { Employee } from '../../types';
import { useData } from '../../context/DataContext';
import { EditEmployeeDialog } from '../EditEmployeeDialog';

interface MobileStaffNavProps {
  currentUser: Employee;
  departmentName: string;
  onNavigate: (screen: 'bulkProcess' | 'shift') => void;
  onLogout: () => void;
}

export function MobileStaffNav({ currentUser, departmentName, onNavigate, onLogout }: MobileStaffNavProps) {
  const { employees, updateEmployee } = useData();
  const [templateOpen, setTemplateOpen] = useState(false);

  const latestCurrentUser = employees.find(e => e.id === currentUser.id) ?? currentUser;

  const handleTemplateEdit = async (
    id: string,
    _name: string,
    _position: string,
    _isManager: boolean,
    password: string,
    defaultStartTime?: string,
    defaultEndTime?: string,
    defaultShiftType?: 'karintou' | 'cafe',
    defaultDays?: string[],
    defaultWishLevel?: number,
  ) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    try {
      await updateEmployee(id, {
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        role: emp.role,
        password: password || emp.password,
        color: emp.color,
        displayOrder: emp.displayOrder,
        departmentId: emp.departmentId,
        defaultStartTime,
        defaultEndTime,
        defaultShiftType,
        defaultDays,
        defaultWishLevel,
      });
      setTemplateOpen(false);
    } catch {
      alert('テンプレートの更新に失敗しました');
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 h-9 flex items-center gap-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
            シフト管理システム
          </span>
          <span className="text-gray-500" style={{ fontSize: '0.7em' }}>Ver. 6.0</span>
        </div>
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentUser.color }} />
            <span className="font-semibold text-gray-800 text-sm">{currentUser.name}</span>
            <span className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              メニュー
            </span>
          </div>
          <button onClick={onLogout} className="p-2 rounded-xl bg-gray-100 active:bg-gray-200">
            <LogOut className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 店舗名 */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-xs text-gray-500 mb-1">担当店舗</p>
        <p className="text-lg font-bold text-indigo-700">{departmentName}</p>
      </div>

      {/* ナビボタン群 */}
      <div className="flex-1 px-5 py-4 space-y-3">
        <button
          onClick={() => onNavigate('bulkProcess')}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-all"
        >
          <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl shadow">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">一括処理</p>
            <p className="text-xs text-gray-500 mt-0.5">シフトの一括入力</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('shift')}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-all"
        >
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">シフト入力</p>
            <p className="text-xs text-gray-500 mt-0.5">勤務希望の入力・確認</p>
          </div>
        </button>

        <button
          onClick={() => setTemplateOpen(true)}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-all"
        >
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">テンプレート設定</p>
            <p className="text-xs text-gray-500 mt-0.5">デフォルト時間・曜日の設定</p>
          </div>
        </button>
      </div>

      <EditEmployeeDialog
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
        employee={latestCurrentUser}
        employees={employees}
        templateMode={true}
        onEdit={handleTemplateEdit}
      />
    </div>
  );
}
