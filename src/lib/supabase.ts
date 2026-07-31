import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bcsgnfqqayqilgdvjjbi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_26DtZZapfMfM0j8oZNIBig_Hjt6iSLS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// データベースの型定義
export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          department_name: string;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      employees: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          position: string;
          role: 'manager' | 'staff';
          password: string;
          color: string;
          department_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };
      availabilities: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          start_time: string;
          end_time: string;
          shift_type: 'karintou' | 'cafe';
          wish_level: number | null;
          status: 'pending' | 'approved' | 'rejected';
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['availabilities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['availabilities']['Insert']>;
      };
    };
  };
}
