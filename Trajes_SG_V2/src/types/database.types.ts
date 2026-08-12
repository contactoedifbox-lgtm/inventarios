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
          full_name: string | null;
          nombres: string | null;
          apellidos: string | null;
          email: string | null;
          rut: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          id_card_path: string | null;
          carnet_frontal_url: string | null;
          carnet_trasera_url: string | null;
          agrupacion: string | null;
          bank_details: Json | null;
          role: string | null;
          rejection_reason: string | null;
          suspended_reason: string | null;
          suspended_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          nombres?: string | null;
          apellidos?: string | null;
          email?: string | null;
          rut?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          id_card_path?: string | null;
          carnet_frontal_url?: string | null;
          carnet_trasera_url?: string | null;
          agrupacion?: string | null;
          bank_details?: Json | null;
          role?: string | null;
          rejection_reason?: string | null;
          suspended_reason?: string | null;
          suspended_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          nombres?: string | null;
          apellidos?: string | null;
          email?: string | null;
          rut?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          id_card_path?: string | null;
          carnet_frontal_url?: string | null;
          carnet_trasera_url?: string | null;
          agrupacion?: string | null;
          bank_details?: Json | null;
          role?: string | null;
          rejection_reason?: string | null;
          suspended_reason?: string | null;
          suspended_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      costumes: {
        Row: {
          id: string;
          owner_id: string;
          type: string | null;
          listing_type: string | null;
          year: string;
          size: string;
          boot_size: string;
          price: number;
          rental_price: number | null;
          sale_price: number | null;
          bank_info: string;
          image_paths: string[];
          status: string;
          is_sold: boolean;
          character_type: string | null;
          bell_count: number | null;
          includes_accessories: boolean | null;
          agrupacion: string | null;
          payment_confirmed: boolean | null;
          availability_alert_user_ids: string[] | null;
          event_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          type?: string | null;
          listing_type?: string | null;
          year: string;
          size: string;
          boot_size: string;
          price: number;
          rental_price?: number | null;
          sale_price?: number | null;
          bank_info: string;
          image_paths?: string[];
          status?: string;
          is_sold?: boolean;
          character_type?: string | null;
          bell_count?: number | null;
          includes_accessories?: boolean | null;
          agrupacion?: string | null;
          payment_confirmed?: boolean | null;
          availability_alert_user_ids?: string[] | null;
          event_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          type?: string | null;
          listing_type?: string | null;
          year?: string;
          size?: string;
          boot_size?: string;
          price?: number;
          rental_price?: number | null;
          sale_price?: number | null;
          bank_info?: string;
          image_paths?: string[];
          status?: string;
          is_sold?: boolean;
          character_type?: string | null;
          bell_count?: number | null;
          includes_accessories?: boolean | null;
          agrupacion?: string | null;
          payment_confirmed?: boolean | null;
          availability_alert_user_ids?: string[] | null;
          event_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
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
          }
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
          }
        ];
      };
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string;
          description: string | null;
          max_global_rentals: number | null;
          max_user_rentals: number | null;
          is_archived: boolean | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          event_date: string;
          description?: string | null;
          max_global_rentals?: number | null;
          max_user_rentals?: number | null;
          is_archived?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          event_date?: string;
          description?: string | null;
          max_global_rentals?: number | null;
          max_user_rentals?: number | null;
          is_archived?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'events_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
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
          event_name: string | null;
          voucher_path: string | null;
          status: string;
          created_at: string | null;
          updated_at: string | null;
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
          event_name?: string | null;
          voucher_path?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
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
          event_name?: string | null;
          voucher_path?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
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
          }
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
          status: string;
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
          status?: string;
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
          status?: string;
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
          }
        ];
      };
      rental_queue: {
        Row: {
          id: string;
          suit_id: string;
          renter_id: string;
          renter_name: string;
          renter_email: string;
          renter_rating: number | null;
          owner_id: string;
          owner_name: string;
          event_name: string | null;
          action_type: string;
          status: string;
          payment_deadline: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          suit_id: string;
          renter_id: string;
          renter_name: string;
          renter_email: string;
          renter_rating?: number | null;
          owner_id: string;
          owner_name: string;
          event_name?: string | null;
          action_type: string;
          status?: string;
          payment_deadline?: string | null;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          suit_id?: string;
          renter_id?: string;
          renter_name?: string;
          renter_email?: string;
          renter_rating?: number | null;
          owner_id?: string;
          owner_name?: string;
          event_name?: string | null;
          action_type?: string;
          status?: string;
          payment_deadline?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rental_queue_suit_id_fkey';
            columns: ['suit_id'];
            isOneToOne: false;
            referencedRelation: 'costumes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rental_queue_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rental_queue_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      system_emails: {
        Row: {
          id: string;
          to_email: string;
          to_name: string;
          from_name: string;
          subject: string;
          body: string;
          type: string;
          suit_id: string | null;
          suit_title: string | null;
          request_id: string | null;
          action_type: string | null;
          read: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          to_email: string;
          to_name: string;
          from_name: string;
          subject: string;
          body: string;
          type: string;
          suit_id?: string | null;
          suit_title?: string | null;
          request_id?: string | null;
          action_type?: string | null;
          read?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          to_email?: string;
          to_name?: string;
          from_name?: string;
          subject?: string;
          body?: string;
          type?: string;
          suit_id?: string | null;
          suit_title?: string | null;
          request_id?: string | null;
          action_type?: string | null;
          read?: boolean | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'system_emails_suit_id_fkey';
            columns: ['suit_id'];
            isOneToOne: false;
            referencedRelation: 'costumes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'system_emails_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'rental_queue';
            referencedColumns: ['id'];
          }
        ];
      };
      event_requests: {
        Row: {
          id: string;
          event_name: string;
          date: string;
          location: string;
          description: string | null;
          owner_id: string;
          owner_name: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_name: string;
          date: string;
          location: string;
          description?: string | null;
          owner_id: string;
          owner_name: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_name?: string;
          date?: string;
          location?: string;
          description?: string | null;
          owner_id?: string;
          owner_name?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_requests_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      carnet_access_logs: {
        Row: {
          id: string;
          viewer_id: string;
          viewer_name: string;
          viewer_role: string;
          target_user_id: string;
          target_user_name: string;
          photo_type: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          viewer_id: string;
          viewer_name: string;
          viewer_role: string;
          target_user_id: string;
          target_user_name: string;
          photo_type: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          viewer_id?: string;
          viewer_name?: string;
          viewer_role?: string;
          target_user_id?: string;
          target_user_name?: string;
          photo_type?: string;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'carnet_access_logs_viewer_id_fkey';
            columns: ['viewer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'carnet_access_logs_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_user_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_user_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
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
          }
        ];
      };
      approval_tokens: {
        Row: {
          token: string;
          target_user_id: string;
          action: string;
          used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          token?: string;
          target_user_id: string;
          action: string;
          used?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          token?: string;
          target_user_id?: string;
          action?: string;
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
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_rental_request: {
        Args: {
          p_suit_id: string;
          p_renter_id: string;
          p_renter_name: string;
          p_renter_email: string;
          p_owner_id: string;
          p_owner_name: string;
          p_event_name: string;
          p_action_type: string;
        };
        Returns: string;
      };
      confirm_availability: {
        Args: {
          p_request_id: string;
          p_suit_id: string;
        };
        Returns: undefined;
      };
      reject_availability: {
        Args: {
          p_request_id: string;
          p_suit_id: string;
        };
        Returns: undefined;
      };
      confirm_payment: {
        Args: {
          p_request_id: string;
          p_suit_id: string;
        };
        Returns: undefined;
      };
      create_event_request: {
        Args: {
          p_event_name: string;
          p_date: string;
          p_location: string;
          p_description: string;
          p_owner_id: string;
          p_owner_name: string;
        };
        Returns: string;
      };
      confirm_sale: {
        Args: {
          p_sale_id: string;
          p_admin_id: string;
        };
        Returns: undefined;
      };
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      set_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
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
