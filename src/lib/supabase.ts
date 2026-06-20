import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bcsgnfqqayqilgdvjjbi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjc2duZnFxYXlxaWxnZHZqamJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzEwMjAsImV4cCI6MjA5MjI0NzAyMH0.izkULBsu3H7vA2n7QegvOhOAIXXfNgWsoylNynrK2vw';

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
