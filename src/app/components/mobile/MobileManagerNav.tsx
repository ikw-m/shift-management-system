import { CalendarDays, Users, Settings, LogOut } from 'lucide-react';
import { Employee } from '../../types';

interface MobileManagerNavProps {
  currentUser: Employee;
  departmentName: string;
  onNavigate: (screen: 'shift' | 'employees' | 'shiftCondition') => void;
  onLogout: () => void;
}

export function MobileManagerNav({ currentUser, departmentName, onNavigate, onLogout }: MobileManagerNavProps) {
  return (
    <div className="flex flex-col h-screen" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ebf0 100%)' }}>
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
              シフト管理システム
            </span>
            <span className="text-gray-500" style={{ fontSize: '0.7em' }}>Ver. 3.3</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentUser.color }} />
            <span className="font-semibold text-gray-800 text-sm">{currentUser.name}</span>
            <span className="text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-0.5 rounded-full tracking-wide">
              管理者メニュー
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
          onClick={() => onNavigate('shift')}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-all"
        >
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">シフト管理</p>
            <p className="text-xs text-gray-500 mt-0.5">シフト入力・承認・確認</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('employees')}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-all"
        >
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">従業員リスト</p>
            <p className="text-xs text-gray-500 mt-0.5">スタッフの登録・編集・並び替え</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('shiftCondition')}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-indigo-100 active:scale-95 transition-all"
        >
          <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl shadow">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">シフト条件設定</p>
            <p className="text-xs text-gray-500 mt-0.5">曜日・祝日・セール期間の要員数設定</p>
          </div>
        </button>
      </div>
    </div>
  );
}
