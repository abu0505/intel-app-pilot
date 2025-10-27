-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage tokens (via edge functions)
-- Users cannot directly view or manipulate their own tokens for security
CREATE POLICY "Service role can manage password reset tokens"
  ON public.password_reset_tokens
  USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes for performance and cleanup
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Function to clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to track password reset requests for rate limiting
CREATE TABLE public.password_reset_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role can manage password reset attempts"
  ON public.password_reset_attempts
  USING (auth.jwt()->>'role' = 'service_role');

-- Create index for rate limiting queries
CREATE INDEX idx_password_reset_attempts_email_time ON public.password_reset_attempts(email, attempted_at);
CREATE INDEX idx_password_reset_attempts_ip_time ON public.password_reset_attempts(ip_address, attempted_at);

-- Function to check rate limiting (max 3 attempts per email per hour)
CREATE OR REPLACE FUNCTION public.check_reset_rate_limit(
  p_email VARCHAR(255),
  p_ip_address INET
)
RETURNS BOOLEAN AS $$
DECLARE
  email_attempts INTEGER;
  ip_attempts INTEGER;
BEGIN
  -- Check email attempts in last hour
  SELECT COUNT(*) INTO email_attempts
  FROM public.password_reset_attempts
  WHERE email = p_email
    AND attempted_at > now() - INTERVAL '1 hour';
  
  -- Check IP attempts in last hour
  SELECT COUNT(*) INTO ip_attempts
  FROM public.password_reset_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > now() - INTERVAL '1 hour';
  
  -- Return false if rate limit exceeded
  RETURN email_attempts < 3 AND ip_attempts < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old reset attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_reset_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_attempts
  WHERE attempted_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
