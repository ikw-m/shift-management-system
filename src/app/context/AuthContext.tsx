import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee } from '../types';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
  currentUser: Employee | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isManager: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_CURRENT_USER = 'shift-management-current-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  // 旧バージョンのlocalStorageキー（アンダースコア形式）を起動時に自動削除
  useEffect(() => {
    const oldKeys = Object.keys(localStorage).filter(key => key.startsWith('shift_management_'));
    oldKeys.forEach(key => localStorage.removeItem(key));
  }, []);

  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // localStorage内の古いデータ（snake_case）にも対応
    return {
      ...parsed,
      departmentId: parsed.departmentId ?? parsed.department_id ?? undefined,
      displayOrder: parsed.displayOrder ?? parsed.display_order ?? 0,
    };
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const { password: _pw, ...userWithoutPassword } = currentUser;
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(userWithoutPassword));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      // Supabaseのsnake_caseをcamelCaseに変換して保存
      setCurrentUser({
        ...data,
        departmentId: data.department_id ?? undefined,
        displayOrder: data.display_order ?? 0,
      });
      return true;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const isManager = currentUser?.role === 'manager';

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isManager, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      currentUser: null,
      login: async () => false,
      logout: () => {},
      isManager: false,
      loading: false,
    } as AuthContextType;
  }
  return context;
}