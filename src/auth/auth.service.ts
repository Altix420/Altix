import { supabase } from '../shared/supabase.js';

export const authService = {
  async login(email: string, password: string) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    return result.data.session;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async requestPasswordRecovery(email: string, redirectTo: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  onSessionChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
