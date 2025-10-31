import { supabase } from '@/integrations/supabase/client';

// Monitor for auth errors globally
export const setupAuthErrorInterceptor = () => {
  // Listen for any auth errors
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_OUT' && !session) {
        // Clear any persisted auth errors
        console.log('Auth state cleared');
      }
    }
  );

  return subscription;
};
