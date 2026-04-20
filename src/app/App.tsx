import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AppContent } from './components/AppContent';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
