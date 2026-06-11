import { Outlet, Link, useLocation } from 'react-router';
import { Calendar, Users, Clock, LayoutDashboard, FileCheck, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { Badge } from './ui/badge';

export function Layout() {
  const location = useLocation();
  const { currentUser, logout, isManager } = useAuth();
  const navigate = useNavigate();

  // ログインしていない場合はログインページへリダイレクト
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'ダッシュボード', icon: LayoutDashboard },
    { path: '/employees', label: '従業員管理', icon: Users, managerOnly: true },
    { path: '/shifts', label: 'シフト管理', icon: Clock },
    { path: '/shift-report', label: 'シフト確定票', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div className="flex flex-col">
                <h1 className="font-semibold text-xl leading-tight">シフト管理システム</h1>
                <span className="text-xs text-gray-500">Ver. 3.1</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm">
                {currentUser?.name}
              </Badge>
              <Button
                variant="ghost"
                className="w-8 h-8"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* サイドバーナビゲーション */}
          <nav className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                if (item.managerOnly && !isManager) {
                  return null;
                }
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive(item.path) ? 'default' : 'ghost'}
                      className="w-full justify-start gap-2"
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* メインコンテンツ */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}