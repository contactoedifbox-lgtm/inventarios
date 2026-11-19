export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          accion: string
          antes: Json | null
          created_at: string
          despues: Json | null
          id: number
          registro_id: string | null
          tabla: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          id?: never
          registro_id?: string | null
          tabla: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          id?: never
          registro_id?: string | null
          tabla?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          apellidos: string
          consentimiento_datos_at: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          email: string | null
          id: string
          nombres: string
          notas: string | null
          origen: Database['public']['Enums']['origen_reserva']
          rut: string
          telefono: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          apellidos: string
          consentimiento_datos_at?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombres: string
          notas?: string | null
          origen?: Database['public']['Enums']['origen_reserva']
          rut: string
          telefono: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          apellidos?: string
          consentimiento_datos_at?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombres?: string
          notas?: string | null
          origen?: Database['public']['Enums']['origen_reserva']
          rut?: string
          telefono?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'clientes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      configuracion: {
        Row: {
          corte_medio_dia: string
          id: boolean
          iva_porcentaje: number
          nombre_negocio: string
          reserva_anticipacion_min_horas: number
          reserva_max_activas_por_contacto: number
          reserva_max_dias: number
          updated_at: string
          updated_by: string | null
          zona_horaria: string
        }
        Insert: {
          corte_medio_dia?: string
          id?: boolean
          iva_porcentaje?: number
          nombre_negocio?: string
          reserva_anticipacion_min_horas?: number
          reserva_max_activas_por_contacto?: number
          reserva_max_dias?: number
          updated_at?: string
          updated_by?: string | null
          zona_horaria?: string
        }
        Update: {
          corte_medio_dia?: string
          id?: boolean
          iva_porcentaje?: number
          nombre_negocio?: string
          reserva_anticipacion_min_horas?: number
          reserva_max_activas_por_contacto?: number
          reserva_max_dias?: number
          updated_at?: string
          updated_by?: string | null
          zona_horaria?: string
        }
        Relationships: []
      }
      excepciones_agenda: {
        Row: {
          area: Database['public']['Enums']['area_agenda'] | null
          created_at: string
          fecha_desde: string
          fecha_hasta: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          modo: Database['public']['Enums']['modo_excepcion']
          motivo: string | null
          profesional_id: string | null
        }
        Insert: {
          area?: Database['public']['Enums']['area_agenda'] | null
          created_at?: string
          fecha_desde: string
          fecha_hasta: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          modo?: Database['public']['Enums']['modo_excepcion']
          motivo?: string | null
          profesional_id?: string | null
        }
        Update: {
          area?: Database['public']['Enums']['area_agenda'] | null
          created_at?: string
          fecha_desde?: string
          fecha_hasta?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          modo?: Database['public']['Enums']['modo_excepcion']
          motivo?: string | null
          profesional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'excepciones_agenda_profesional_id_fkey'
            columns: ['profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['id']
          },
        ]
      }
      horarios_semanales: {
        Row: {
          dia_semana: number
          fin_min: number | null
          hora_fin: string
          hora_inicio: string
          id: string
          inicio_min: number | null
          profesional_id: string
        }
        Insert: {
          dia_semana: number
          fin_min?: number | null
          hora_fin: string
          hora_inicio: string
          id?: string
          inicio_min?: number | null
          profesional_id: string
        }
        Update: {
          dia_semana?: number
          fin_min?: number | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          inicio_min?: number | null
          profesional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'horarios_semanales_profesional_id_fkey'
            columns: ['profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['id']
          },
        ]
      }
      ingreso_items: {
        Row: {
          cantidad: number
          id: string
          ingreso_id: string
          producto_id: string
        }
        Insert: {
          cantidad: number
          id?: string
          ingreso_id: string
          producto_id: string
        }
        Update: {
          cantidad?: number
          id?: string
          ingreso_id?: string
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ingreso_items_ingreso_id_fkey'
            columns: ['ingreso_id']
            isOneToOne: false
            referencedRelation: 'ingresos_inventario'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ingreso_items_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
        ]
      }
      ingresos_inventario: {
        Row: {
          created_at: string
          documento_referencia: string | null
          id: string
          notas: string | null
          proveedor_id: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          documento_referencia?: string | null
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          documento_referencia?: string | null
          id?: string
          notas?: string | null
          proveedor_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ingresos_inventario_proveedor_id_fkey'
            columns: ['proveedor_id']
            isOneToOne: false
            referencedRelation: 'proveedores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ingresos_inventario_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      intentos_reserva_publica: {
        Row: {
          created_at: string
          email_norm: string | null
          id: number
          ip_hash: string | null
          resultado: string
          telefono_norm: string | null
        }
        Insert: {
          created_at?: string
          email_norm?: string | null
          id?: never
          ip_hash?: string | null
          resultado: string
          telefono_norm?: string | null
        }
        Update: {
          created_at?: string
          email_norm?: string | null
          id?: never
          ip_hash?: string | null
          resultado?: string
          telefono_norm?: string | null
        }
        Relationships: []
      }
      mascotas: {
        Row: {
          activa: boolean
          cliente_id: string
          created_at: string
          especie: Database['public']['Enums']['especie']
          esterilizado: boolean | null
          fecha_nacimiento: string | null
          id: string
          nombre: string
          observaciones: string | null
          peso_kg: number | null
          raza: string | null
          sexo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activa?: boolean
          cliente_id: string
          created_at?: string
          especie: Database['public']['Enums']['especie']
          esterilizado?: boolean | null
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          observaciones?: string | null
          peso_kg?: number | null
          raza?: string | null
          sexo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activa?: boolean
          cliente_id?: string
          created_at?: string
          especie?: Database['public']['Enums']['especie']
          esterilizado?: boolean | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          observaciones?: string | null
          peso_kg?: number | null
          raza?: string | null
          sexo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mascotas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          created_at: string
          id: number
          motivo: string | null
          producto_id: string
          referencia_id: string | null
          stock_resultante: number
          tipo: Database['public']['Enums']['tipo_movimiento']
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: never
          motivo?: string | null
          producto_id: string
          referencia_id?: string | null
          stock_resultante: number
          tipo: Database['public']['Enums']['tipo_movimiento']
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: never
          motivo?: string | null
          producto_id?: string
          referencia_id?: string | null
          stock_resultante?: number
          tipo?: Database['public']['Enums']['tipo_movimiento']
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'movimientos_inventario_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimientos_inventario_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre_completo: string
          rol: Database['public']['Enums']['rol_usuario']
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id: string
          nombre_completo: string
          rol?: Database['public']['Enums']['rol_usuario']
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_completo?: string
          rol?: Database['public']['Enums']['rol_usuario']
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean
          codigo_barras: string | null
          created_at: string
          descripcion: string | null
          id: string
          iva_precio_venta: number
          nombre: string
          precio_venta_neto: number
          precio_venta_total: number
          stock: number
          stock_minimo: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo_barras?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          iva_precio_venta?: number
          nombre: string
          precio_venta_neto: number
          precio_venta_total?: number
          stock?: number
          stock_minimo?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo_barras?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          iva_precio_venta?: number
          nombre?: string
          precio_venta_neto?: number
          precio_venta_total?: number
          stock?: number
          stock_minimo?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      productos_costos: {
        Row: {
          costo_neto: number
          costo_total: number
          iva_costo: number
          producto_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          costo_neto?: number
          costo_total?: number
          iva_costo?: number
          producto_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          costo_neto?: number
          costo_total?: number
          iva_costo?: number
          producto_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'productos_costos_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: true
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
        ]
      }
      profesionales: {
        Row: {
          activo: boolean
          area: Database['public']['Enums']['area_agenda']
          color: string | null
          created_at: string
          duracion_slot_min: number
          id: string
          nombre: string
          orden: number
          perfil_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          area: Database['public']['Enums']['area_agenda']
          color?: string | null
          created_at?: string
          duracion_slot_min?: number
          id?: string
          nombre: string
          orden?: number
          perfil_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          area?: Database['public']['Enums']['area_agenda']
          color?: string | null
          created_at?: string
          duracion_slot_min?: number
          id?: string
          nombre?: string
          orden?: number
          perfil_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profesionales_perfil_id_fkey'
            columns: ['perfil_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          id: string
          nombre: string
          rut: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
          rut?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          rut?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      reservas: {
        Row: {
          cancelada_at: string | null
          cancelada_motivo: string | null
          cliente_id: string
          creada_por: string | null
          created_at: string
          estado: Database['public']['Enums']['estado_reserva']
          fin: string
          fuera_de_horario: boolean
          id: string
          inicio: string
          mascota_id: string | null
          motivo: string | null
          notas_internas: string | null
          origen: Database['public']['Enums']['origen_reserva']
          profesional_id: string
          token_gestion_hash: string | null
          updated_at: string
        }
        Insert: {
          cancelada_at?: string | null
          cancelada_motivo?: string | null
          cliente_id: string
          creada_por?: string | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_reserva']
          fin: string
          fuera_de_horario?: boolean
          id?: string
          inicio: string
          mascota_id?: string | null
          motivo?: string | null
          notas_internas?: string | null
          origen?: Database['public']['Enums']['origen_reserva']
          profesional_id: string
          token_gestion_hash?: string | null
          updated_at?: string
        }
        Update: {
          cancelada_at?: string | null
          cancelada_motivo?: string | null
          cliente_id?: string
          creada_por?: string | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_reserva']
          fin?: string
          fuera_de_horario?: boolean
          id?: string
          inicio?: string
          mascota_id?: string | null
          motivo?: string | null
          notas_internas?: string | null
          origen?: Database['public']['Enums']['origen_reserva']
          profesional_id?: string
          token_gestion_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reservas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_creada_por_fkey'
            columns: ['creada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_mascota_id_fkey'
            columns: ['mascota_id']
            isOneToOne: false
            referencedRelation: 'mascotas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_profesional_id_fkey'
            columns: ['profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['id']
          },
        ]
      }
      venta_items: {
        Row: {
          cantidad: number
          codigo_barras: string | null
          id: string
          iva_unitario: number
          nombre_producto: string
          precio_unitario_neto: number
          producto_id: string
          reingresa_stock: boolean
          total_linea: number
          venta_id: string
        }
        Insert: {
          cantidad: number
          codigo_barras?: string | null
          id?: string
          iva_unitario: number
          nombre_producto: string
          precio_unitario_neto: number
          producto_id: string
          reingresa_stock?: boolean
          total_linea: number
          venta_id: string
        }
        Update: {
          cantidad?: number
          codigo_barras?: string | null
          id?: string
          iva_unitario?: number
          nombre_producto?: string
          precio_unitario_neto?: number
          producto_id?: string
          reingresa_stock?: boolean
          total_linea?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'venta_items_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'venta_items_venta_id_fkey'
            columns: ['venta_id']
            isOneToOne: false
            referencedRelation: 'ventas'
            referencedColumns: ['id']
          },
        ]
      }
      venta_items_costos: {
        Row: {
          costo_unitario_neto: number
          venta_item_id: string
        }
        Insert: {
          costo_unitario_neto: number
          venta_item_id: string
        }
        Update: {
          costo_unitario_neto?: number
          venta_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'venta_items_costos_venta_item_id_fkey'
            columns: ['venta_item_id']
            isOneToOne: true
            referencedRelation: 'venta_items'
            referencedColumns: ['id']
          },
        ]
      }
      ventas: {
        Row: {
          anulada_at: string | null
          anulada_por: string | null
          created_at: string
          estado: Database['public']['Enums']['estado_venta']
          id: string
          medio_pago: Database['public']['Enums']['medio_pago']
          motivo: string | null
          numero: number
          tipo: Database['public']['Enums']['tipo_venta']
          total: number
          total_iva: number
          total_neto: number
          vendedor_id: string
          venta_origen_id: string | null
        }
        Insert: {
          anulada_at?: string | null
          anulada_por?: string | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_venta']
          id?: string
          medio_pago: Database['public']['Enums']['medio_pago']
          motivo?: string | null
          numero?: never
          tipo?: Database['public']['Enums']['tipo_venta']
          total?: number
          total_iva?: number
          total_neto?: number
          vendedor_id: string
          venta_origen_id?: string | null
        }
        Update: {
          anulada_at?: string | null
          anulada_por?: string | null
          created_at?: string
          estado?: Database['public']['Enums']['estado_venta']
          id?: string
          medio_pago?: Database['public']['Enums']['medio_pago']
          motivo?: string | null
          numero?: never
          tipo?: Database['public']['Enums']['tipo_venta']
          total?: number
          total_iva?: number
          total_neto?: number
          vendedor_id?: string
          venta_origen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ventas_anulada_por_fkey'
            columns: ['anulada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ventas_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ventas_venta_origen_id_fkey'
            columns: ['venta_origen_id']
            isOneToOne: false
            referencedRelation: 'ventas'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_inventario: {
        Row: {
          activo: boolean | null
          codigo_barras: string | null
          costo_neto: number | null
          costo_total: number | null
          descripcion: string | null
          id: string | null
          iva_costo: number | null
          iva_precio_venta: number | null
          margen_neto: number | null
          nombre: string | null
          precio_venta_neto: number | null
          precio_venta_total: number | null
          stock: number | null
          stock_bajo: boolean | null
          stock_minimo: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ajustar_stock: {
        Args: { p_motivo: string; p_nuevo_stock: number; p_producto_id: string }
        Returns: number
      }
      anonimizar_cliente: { Args: { p_cliente_id: string }; Returns: undefined }
      anular_venta: {
        Args: { p_motivo: string; p_venta_id: string }
        Returns: undefined
      }
      cambiar_estado_reserva: {
        Args: {
          p_estado: Database['public']['Enums']['estado_reserva']
          p_motivo?: string
          p_reserva_id: string
        }
        Returns: undefined
      }
      cancelar_reserva_publica: {
        Args: { p_token: string }
        Returns: undefined
      }
      config_publica: {
        Args: never
        Returns: {
          nombre_negocio: string
          reserva_anticipacion_min_horas: number
          reserva_max_activas_por_contacto: number
          reserva_max_dias: number
        }[]
      }
      crear_reserva_interna: {
        Args: {
          p_cliente_id: string
          p_fin?: string
          p_forzar_fuera_horario?: boolean
          p_inicio: string
          p_mascota_id: string
          p_motivo?: string
          p_profesional_id: string
        }
        Returns: string
      }
      crear_reserva_publica: {
        Args: {
          p_cliente: Json
          p_inicio: string
          p_mascota: Json
          p_motivo: string
          p_profesional_id: string
        }
        Returns: Json
      }
      horarios_disponibles: {
        Args: { p_desde: string; p_hasta: string; p_profesional_id: string }
        Returns: {
          fin: string
          inicio: string
        }[]
      }
      profesionales_publicos: {
        Args: never
        Returns: {
          area: Database['public']['Enums']['area_agenda']
          id: string
          nombre: string
        }[]
      }
      registrar_devolucion: {
        Args: {
          p_items: Json
          p_medio_pago: Database['public']['Enums']['medio_pago']
          p_motivo: string
          p_venta_origen_id?: string
        }
        Returns: Json
      }
      registrar_ingreso: {
        Args: {
          p_documento?: string
          p_items: Json
          p_notas?: string
          p_proveedor_id?: string
        }
        Returns: string
      }
      registrar_venta: {
        Args: {
          p_items: Json
          p_medio_pago: Database['public']['Enums']['medio_pago']
        }
        Returns: Json
      }
      reporte_ventas_productos: {
        Args: { p_agrupar?: string; p_desde: string; p_hasta: string }
        Returns: {
          nombre_producto: string
          periodo: string
          producto_id: string
          total: number
          total_iva: number
          total_neto: number
          unidades: number
        }[]
      }
    }
    Enums: {
      area_agenda: 'veterinaria' | 'peluqueria'
      especie: 'perro' | 'gato' | 'otro'
      estado_reserva: 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
      estado_venta: 'completada' | 'anulada'
      medio_pago: 'efectivo' | 'debito' | 'credito' | 'transferencia'
      modo_excepcion: 'cerrar' | 'abrir'
      origen_reserva: 'interno' | 'web'
      rol_usuario: 'maestro' | 'vendedor'
      tipo_movimiento: 'venta' | 'devolucion' | 'ingreso' | 'ajuste' | 'anulacion'
      tipo_venta: 'venta' | 'devolucion'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      area_agenda: ['veterinaria', 'peluqueria'],
      especie: ['perro', 'gato', 'otro'],
      estado_reserva: ['confirmada', 'completada', 'cancelada', 'no_asistio'],
      estado_venta: ['completada', 'anulada'],
      medio_pago: ['efectivo', 'debito', 'credito', 'transferencia'],
      modo_excepcion: ['cerrar', 'abrir'],
      origen_reserva: ['interno', 'web'],
      rol_usuario: ['maestro', 'vendedor'],
      tipo_movimiento: ['venta', 'devolucion', 'ingreso', 'ajuste', 'anulacion'],
      tipo_venta: ['venta', 'devolucion'],
    },
  },
} as const
