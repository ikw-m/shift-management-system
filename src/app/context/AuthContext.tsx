import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee } from '../types';

interface AuthContextType {
  currentUser: Employee | null;
  login: (email: string, password: string, employees: Employee[]) => boolean;
  logout: () => void;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_CURRENT_USER = 'shift-management-current-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  const login = (email: string, password: string, employees: Employee[]): boolean => {
    const user = employees.find(
      emp => emp.email === email && emp.password === password
    );
    
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const isManager = currentUser?.role === 'manager';

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
