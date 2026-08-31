import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AppContent } from './components/AppContent';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </DataProvider>
    </AuthProvider>
  );
}
