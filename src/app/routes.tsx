import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Shifts } from './pages/Shifts';
import { ShiftReport } from './pages/ShiftReport';
import { Login } from './pages/Login';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout />
  </ProtectedRoute>
);

const ManagerOnlyEmployees = () => (
  <ProtectedRoute requireManager>
    <Employees />
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'employees', Component: ManagerOnlyEmployees },
      { path: 'shifts', Component: Shifts },
      { path: 'shift-report', Component: ShiftReport },
    ],
  },
]);