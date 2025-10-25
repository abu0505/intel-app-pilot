import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
          toast({
            title: "Email verified successfully!",
            description: "You can now sign in to your account.",
          });
          navigate('/auth');
        } else {
          // Handle hash fragment from email confirmation
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) throw sessionError;

            toast({
              title: "Email verified successfully!",
              description: "You can now sign in to your account.",
            });
            navigate('/auth');
          } else {
            throw new Error('No tokens found in URL');
          }
        }
      } catch (error) {
        console.error('Error during email confirmation:', error);
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: "There was a problem verifying your email. Please try signing in or contact support.",
        });
        navigate('/auth');
      }
    };

    handleEmailConfirmation();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-muted-foreground">Verifying your email...</p>
    </div>
  );
};

export default AuthCallback;
