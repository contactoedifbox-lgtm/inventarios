'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { SystemEmail } from '@/types/models';

/**
 * Hooks para la bandeja de correos del sistema
 */

// ============================================================
// Obtener correos del usuario
// ============================================================

export function useSystemEmails() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['system-emails'],
    queryFn: async (): Promise<SystemEmail[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Obtener el email del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const userEmail = profile?.email || user.email;

      const { data, error } = await supabase
        .from('system_emails')
        .select('*')
        .eq('to_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as SystemEmail[];
    },
  });
}

// ============================================================
// Obtener correos del usuario (con filtro de no leídos)
// ============================================================

export function useUnreadEmails() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['system-emails', 'unread'],
    queryFn: async (): Promise<SystemEmail[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const userEmail = profile?.email || user.email;

      const { data, error } = await supabase
        .from('system_emails')
        .select('*')
        .eq('to_email', userEmail)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as SystemEmail[];
    },
  });
}

// ============================================================
// Marcar correo como leído
// ============================================================

export function useMarkEmailRead() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      const { error } = await supabase
        .from('system_emails')
        .update({ read: true })
        .eq('id', emailId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-emails'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al marcar correo como leído');
    },
  });
}

// ============================================================
// Enviar correo del sistema (simulado + real)
// ============================================================

export interface SendSystemEmailPayload {
  toEmail: string;
  toName: string;
  fromName: string;
  subject: string;
  body: string;
  type: string;
  suitId?: string;
  suitTitle?: string;
  requestId?: string;
  actionType?: string;
}

export function useSendSystemEmail() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendSystemEmailPayload) => {
      // Guardar en la tabla system_emails (simulado)
      const { data, error } = await supabase
        .from('system_emails')
        .insert({
          to_email: payload.toEmail,
          to_name: payload.toName,
          from_name: payload.fromName,
          subject: payload.subject,
          body: payload.body,
          type: payload.type,
          suit_id: payload.suitId,
          suit_title: payload.suitTitle,
          request_id: payload.requestId,
          action_type: payload.actionType,
          read: false,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // También enviar email real (si está configurado)
      try {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: payload.toEmail,
            subject: payload.subject,
            html: payload.body,
          }),
        });

        if (!response.ok) {
          console.warn('Email real no enviado (API no disponible)');
        }
      } catch (err) {
        console.warn('Error enviando email real:', err);
      }

      return data as SystemEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-emails'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al enviar correo');
    },
  });
}

// ============================================================
// Obtener conteo de correos no leídos
// ============================================================

export function useUnreadCount() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['system-emails', 'count'],
    queryFn: async (): Promise<number> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const userEmail = profile?.email || user.email;

      const { count, error } = await supabase
        .from('system_emails')
        .select('*', { count: 'exact', head: true })
        .eq('to_email', userEmail)
        .eq('read', false);

      if (error) throw new Error(error.message);
      return count || 0;
    },
  });
}
