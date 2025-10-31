import { supabase } from '@/integrations/supabase/client';

export const clearAuthSession = async () => {
  try {
    // Sign out through Supabase (clears cookies and localStorage)
    await supabase.auth.signOut();
    
    // Double-check: manually clear localStorage keys
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (projectId) {
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(`sb-${projectId}-auth`)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    console.log('Auth session cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing auth session:', error);
    return false;
  }
};
