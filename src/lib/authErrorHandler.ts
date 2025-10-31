import { supabase } from '@/integrations/supabase/client';

export const handleAuthError = async (error: any) => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Check if it's a refresh token error
  if (
    errorMessage.includes('refresh token') ||
    errorMessage.includes('invalid refresh token') ||
    errorMessage.includes('refresh token not found')
  ) {
    console.warn('Invalid refresh token detected, clearing auth state...');
    
    // Force sign out to clear all auth state
    await supabase.auth.signOut();
    
    // Clear any remaining localStorage items
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (projectId) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`sb-${projectId}-auth`)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    return true; // Error was handled
  }
  
  return false; // Error was not an auth error
};
