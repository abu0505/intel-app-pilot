-- Fix security definer functions by setting fixed search_path
-- This prevents potential privilege escalation through search path manipulation

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix cleanup_expired_reset_tokens function
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix check_reset_rate_limit function
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix cleanup_old_reset_attempts function
CREATE OR REPLACE FUNCTION public.cleanup_old_reset_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_attempts
  WHERE attempted_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;