import { User, Plus, Trash2, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { Employee } from '../types';

interface EmployeeListProps {
  employees: Employee[];
  currentUser: Employee;
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
  onRemoveEmployee: (id: string) => void;
  onMoveEmployee: (id: string, direction: 'up' | 'down') => void;
}

export function EmployeeList({ employees, currentUser, onAddEmployee, onEditEmployee, onRemoveEmployee, onMoveEmployee }: EmployeeListProps) {
  // 従業員をdisplayOrderでソート
  const sortedEmployees = [...employees].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-xl overflow-hidden">
      {/* 固定ヘッダー */}
      <div className="p-6 pb-4 border-b border-gray-200/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-gray-800">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            従業員リスト
          </h2>
          {currentUser.isManager && (
            <button
              onClick={onAddEmployee}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          )}
        </div>
        {!currentUser.isManager && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-sm text-blue-800 border border-blue-200 shadow-sm">
            ※ 従業員の追加・編集・削除は管理者のみが行えます
          </div>
        )}
      </div>
      
      {/* スクロール可能な明細エリア */}
      <div className="p-6 pt-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div className="space-y-3">
          {sortedEmployees.length === 0 ? (
            <p className="text-gray-500 text-center py-8">従業員が登録されていません</p>
          ) : (
            sortedEmployees.map((employee, index) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-indigo-50/30 rounded-xl hover:shadow-md transition-all duration-200 border border-indigo-100 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  {currentUser.isManager && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => onMoveEmployee(employee.id, 'up')}
                        disabled={index === 0}
                        className={`p-0.5 rounded transition-all duration-200 ${
                          index === 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-indigo-600 hover:bg-indigo-100 hover:scale-110'
                        }`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onMoveEmployee(employee.id, 'down')}
                        disabled={index === sortedEmployees.length - 1}
                        className={`p-0.5 rounded transition-all duration-200 ${
                          index === sortedEmployees.length - 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-indigo-600 hover:bg-indigo-100 hover:scale-110'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{employee.name}</p>
                    <p className="text-sm text-indigo-600">
                      {employee.position || (employee.role === 'manager' || employee.isManager ? 'マネージャー' : 'スタッフ')}
                    </p>
                  </div>
                </div>
                {currentUser.isManager && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditEmployee(employee)}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all duration-200 hover:scale-110"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {employee.id !== currentUser.id && (
                      <button
                        onClick={() => onRemoveEmployee(employee.id)}
                        className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-all duration-200 hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}