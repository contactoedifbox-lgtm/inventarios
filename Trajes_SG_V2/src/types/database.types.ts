export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          rut: string;
          phone: string;
          address: string;
          city: string;
          id_card_path: string | null;
          role: Database['public']['Enums']['user_role'];
          rejection_reason: string | null;
          suspended_reason: string | null;
          suspended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          rut: string;
          phone: string;
          address: string;
          city: string;
          id_card_path?: string | null;
          role?: Database['public']['Enums']['user_role'];
          rejection_reason?: string | null;
          suspended_reason?: string | null;
          suspended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          rut?: string;
          phone?: string;
          address?: string;
          city?: string;
          id_card_path?: string | null;
          role?: Database['public']['Enums']['user_role'];
          rejection_reason?: string | null;
          suspended_reason?: string | null;
          suspended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string;
          max_global_rentals: number;
          max_user_rentals: number;
          is_archived: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_date: string;
          max_global_rentals?: number;
          max_user_rentals?: number;
          is_archived?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          event_date?: string;
          max_global_rentals?: number;
          max_user_rentals?: number;
          is_archived?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      costumes: {
        Row: {
          id: string;
          owner_id: string;
          type: Database['public']['Enums']['costume_type'];
          year: string;
          size: string;
          boot_size: string;
          price: number;
          bank_info: string;
          image_paths: string[];
          status: Database['public']['Enums']['costume_status'];
          is_sold: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          type: Database['public']['Enums']['costume_type'];
          year: string;
          size: string;
          boot_size: string;
          price: number;
          bank_info: string;
          image_paths?: string[];
          status?: Database['public']['Enums']['costume_status'];
          is_sold?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          type?: Database['public']['Enums']['costume_type'];
          year?: string;
          size?: string;
          boot_size?: string;
          price?: number;
          bank_info?: string;
          image_paths?: string[];
          status?: Database['public']['Enums']['costume_status'];
          is_sold?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'costumes_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'costumes_owner_profiles_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      costume_events: {
        Row: {
          costume_id: string;
          event_id: string;
        };
        Insert: {
          costume_id: string;
          event_id: string;
        };
        Update: {
          costume_id?: string;
          event_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'costume_events_costume_id_fkey';
            columns: ['costume_id'];
            isOneToOne: false;
            referencedRelation: 'costumes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'costume_events_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      rentals: {
        Row: {
          id: string;
          costume_id: string;
          renter_id: string;
          first_name: string;
          last_name: string;
          rut: string;
          phone: string;
          email: string;
          event_id: string;
          voucher_path: string | null;
          status: 'reservado' | 'arrendado';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          costume_id: string;
          renter_id: string;
          first_name: string;
          last_name: string;
          rut: string;
          phone: string;
          email: string;
          event_id: string;
          voucher_path?: string | null;
          status?: 'reservado' | 'arrendado';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          costume_id?: string;
          renter_id?: string;
          first_name?: string;
          last_name?: string;
          rut?: string;
          phone?: string;
          email?: string;
          event_id?: string;
          voucher_path?: string | null;
          status?: 'reservado' | 'arrendado';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rentals_costume_id_fkey';
            columns: ['costume_id'];
            isOneToOne: false;
            referencedRelation: 'costumes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rentals_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rentals_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rentals_renter_profiles_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          costume_id: string;
          buyer_id: string;
          first_name: string;
          last_name: string;
          rut: string;
          phone: string;
          email: string;
          voucher_path: string | null;
          status: 'reservado' | 'completado';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          costume_id: string;
          buyer_id: string;
          first_name: string;
          last_name: string;
          rut: string;
          phone: string;
          email: string;
          voucher_path?: string | null;
          status?: 'reservado' | 'completado';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          costume_id?: string;
          buyer_id?: string;
          first_name?: string;
          last_name?: string;
          rut?: string;
          phone?: string;
          email?: string;
          voucher_path?: string | null;
          status?: 'reservado' | 'completado';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sales_costume_id_fkey';
            columns: ['costume_id'];
            isOneToOne: false;
            referencedRelation: 'costumes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_buyer_profiles_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: Database['public']['Enums']['audit_action'];
          target_user_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: Database['public']['Enums']['audit_action'];
          target_user_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: Database['public']['Enums']['audit_action'];
          target_user_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_admin_profiles_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_target_profiles_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      approval_tokens: {
        Row: {
          token: string;
          target_user_id: string;
          action: 'approve' | 'reject';
          used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          token?: string;
          target_user_id: string;
          action: 'approve' | 'reject';
          used?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          token?: string;
          target_user_id?: string;
          action?: 'approve' | 'reject';
          used?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'approval_tokens_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_approved: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      confirm_sale: {
        Args: { p_sale_id: string; p_admin_id: string };
        Returns: undefined;
      };
      reset_costumes_post_event: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_rental: {
        Args: {
          p_costume_id: string;
          p_renter_id: string;
          p_first_name: string;
          p_last_name: string;
          p_rut: string;
          p_phone: string;
          p_email: string;
          p_event_id: string;
        };
        Returns: string;
      };
      create_sale: {
        Args: {
          p_costume_id: string;
          p_buyer_id: string;
          p_first_name: string;
          p_last_name: string;
          p_rut: string;
          p_phone: string;
          p_email: string;
        };
        Returns: string;
      };
      count_event_rentals: {
        Args: { p_event_id: string };
        Returns: number;
      };
      count_user_event_rentals: {
        Args: { p_event_id: string; p_renter_id: string };
        Returns: number;
      };
    };
    Enums: {
      user_role: 'super_admin' | 'pending' | 'approved' | 'rejected' | 'suspended';
      costume_type: 'rent' | 'sale';
      costume_status: 'disponible' | 'reservado' | 'arrendado';
      audit_action:
        | 'user_approved'
        | 'user_rejected'
        | 'user_suspended'
        | 'user_reactivated'
        | 'user_deleted'
        | 'event_created'
        | 'event_updated'
        | 'event_deleted'
        | 'rental_confirmed'
        | 'sale_confirmed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ---------- Helpers de conveniencia ----------
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];