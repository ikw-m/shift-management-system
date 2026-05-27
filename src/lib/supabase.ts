import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// データベースの型定義
export interface Database {
  public: {
    Tables: {
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
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };
      shifts: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          start_time: string;
          end_time: string;
          notes: string;
          status: 'pending' | 'approved' | 'rejected';
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shifts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['shifts']['Insert']>;
      };
      availabilities: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          start_time: string;
          end_time: string;
          shift_type: 'karintou' | 'cafe';
          status: 'pending' | 'approved' | 'rejected';
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['availabilities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['availabilities']['Insert']>;
      };
      daily_notes: {
        Row: {
          date: string;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_notes']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['daily_notes']['Insert']>;
      };
      monthly_procedures: {
        Row: {
          year: number;
          month: number;
          procedure: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['monthly_procedures']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['monthly_procedures']['Insert']>;
      };
      shift_conditions: {
        Row: {
          year: number;
          data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shift_conditions']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['shift_conditions']['Insert']>;
      };
    };
  };
}