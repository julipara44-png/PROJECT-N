import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://your-supabase-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export const logAudit = async (
  action_type: 'CREATE' | 'UPDATE' | 'DELETE',
  table_name: string,
  record_id: string,
  old_value: any,
  new_value: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('users').select('id, business_id').eq('auth_id', user.id).single();
    if (!profile) return;
    
    await supabase.from('audit_logs').insert({
      business_id: profile.business_id,
      user_id: profile.id,
      action_type,
      table_name,
      record_id,
      old_value,
      new_value
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

export const getClientIp = async (): Promise<string> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '103.102.114.42';
  } catch (e) {
    return '103.102.114.42'; // Default Kathmandu, Nepal IP fallback
  }
};

export const logSecurityEvent = async (
  event_type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'SESSION_REVOKED' | '2FA_ENABLED' | '2FA_DISABLED' | 'PASSWORD_CHANGED',
  metadata?: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('users').select('id, business_id').eq('auth_id', user.id).single();
    if (!profile) return;

    const ip_address = await getClientIp();
    const user_agent = navigator.userAgent;

    await supabase.from('security_events').insert({
      business_id: profile.business_id,
      user_id: profile.id,
      event_type,
      ip_address,
      user_agent,
      metadata
    });
  } catch (error) {
    console.error('Security log failed:', error);
  }
};

