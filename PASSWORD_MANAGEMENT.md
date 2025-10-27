# Password Management System Documentation

## Overview

This document describes the complete password management system implemented for the StudyAI application, including forgot password and change password features.

## Features

### 1. Forgot Password Flow
- **Email-based password reset**: Users can request a password reset by entering their email address
- **Secure token generation**: Creates unique, time-limited reset tokens (1-hour expiration)
- **Rate limiting**: Prevents abuse with configurable limits (3 attempts per email per hour, 10 per IP)
- **Email notifications**: Sends password reset links via email (HTML formatted)
- **Security best practices**: Doesn't reveal whether an email exists in the system

### 2. Reset Password
- **Token validation**: Verifies token existence, expiration, and usage status
- **Password strength validation**: Enforces strong password requirements
- **Visual feedback**: Real-time password strength indicator
- **One-time use tokens**: Tokens are invalidated after successful password reset
- **Session invalidation**: All existing sessions are logged out for security

### 3. Change Password
- **Protected route**: Only accessible to authenticated users
- **Current password verification**: Requires users to confirm their current password
- **Password validation**: Ensures new password meets security requirements
- **Strength indicator**: Visual feedback on password quality
- **Success confirmation**: Clear feedback and automatic redirect

## Architecture

### Database Schema

#### `password_reset_tokens` Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- token: VARCHAR(255) (Unique)
- expires_at: TIMESTAMP WITH TIME ZONE
- used_at: TIMESTAMP WITH TIME ZONE (nullable)
- created_at: TIMESTAMP WITH TIME ZONE
- ip_address: INET
- user_agent: TEXT
```

#### `password_reset_attempts` Table
```sql
- id: UUID (Primary Key)
- email: VARCHAR(255)
- ip_address: INET
- attempted_at: TIMESTAMP WITH TIME ZONE
- success: BOOLEAN
```

### Edge Functions

#### 1. `request-password-reset`
- **Purpose**: Handles password reset requests
- **Authentication**: No JWT required (public endpoint)
- **Rate Limiting**: 3 attempts/hour per email, 10/hour per IP
- **Process**:
  1. Validates email format
  2. Checks rate limits
  3. Verifies user exists (without revealing to client)
  4. Generates secure token
  5. Stores token with expiration
  6. Sends email with reset link
  7. Logs attempt

#### 2. `reset-password`
- **Purpose**: Handles password reset with token
- **Authentication**: No JWT required (uses token validation)
- **Process**:
  1. Validates token and new password
  2. Checks token expiration
  3. Updates user password
  4. Marks token as used
  5. Invalidates all sessions

#### 3. `change-password`
- **Purpose**: Allows authenticated users to change password
- **Authentication**: JWT required
- **Process**:
  1. Verifies current password
  2. Validates new password
  3. Ensures new password differs from current
  4. Updates password
  5. Returns success

### Frontend Pages

#### 1. `/forgot-password` - ForgotPassword.tsx
- Email input form
- Success state with confirmation
- Link back to login
- Matches existing design system

#### 2. `/reset-password` - ResetPassword.tsx
- Token validation from URL query parameter
- New password input with confirmation
- Real-time password strength indicator
- Password requirements checklist
- Success state with auto-redirect

#### 3. `/change-password` - ChangePassword.tsx
- Protected route (requires authentication)
- Current password verification
- New password with confirmation
- Password strength indicator
- Success state with navigation

## Password Requirements

All passwords must meet the following criteria:
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ Visual strength indicator (5 levels)

## Security Features

### 1. Rate Limiting
- **Email-based**: Maximum 3 reset requests per hour per email
- **IP-based**: Maximum 10 reset requests per hour per IP address
- **Database tracking**: All attempts logged for audit purposes
- **Automatic cleanup**: Old attempts removed after 24 hours

### 2. Token Security
- **Unique tokens**: Generated using crypto.randomUUID() (RFC 4122)
- **Time-limited**: Tokens expire after 1 hour
- **One-time use**: Tokens invalidated after successful password reset
- **Secure storage**: Stored with metadata (IP, user agent) for audit
- **Session invalidation**: All user sessions terminated on password reset

### 3. Information Disclosure Prevention
- **Generic responses**: Same message whether user exists or not
- **Timing attack mitigation**: Consistent response times
- **No enumeration**: Can't determine valid emails from responses

### 4. Database Security
- **Row Level Security (RLS)**: Enabled on all tables
- **Service role only**: Reset tokens managed only by service role
- **Secure functions**: All database functions use SECURITY DEFINER
- **Indexed queries**: Optimized for performance and security

## Setup Instructions

### 1. Database Migration

Run the migration to create required tables:

```bash
supabase db push
```

Or manually run the migration file:
```bash
supabase migration up
```

### 2. Edge Functions Deployment

Deploy all three edge functions:

```bash
# Deploy request-password-reset
supabase functions deploy request-password-reset

# Deploy reset-password
supabase functions deploy reset-password

# Deploy change-password
supabase functions deploy change-password
```

### 3. Environment Configuration

Ensure these environment variables are set in Supabase:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations)
- `SUPABASE_ANON_KEY`: Anonymous key (for public access)

### 4. Email Configuration (Optional but Recommended)

Configure SMTP settings in Supabase dashboard:
1. Go to Authentication > Email Templates
2. Configure SMTP settings
3. Customize password reset email template

**Note**: The current implementation includes a development mode that returns the reset link in the response for testing purposes. Remove the `dev_reset_link` field in production.

## Usage Examples

### Forgot Password Flow

1. User clicks "Forgot password?" on login page
2. User enters email address
3. System sends reset email (or shows dev link)
4. User clicks link in email
5. User enters new password (meeting requirements)
6. Password is reset, user redirected to login

### Change Password Flow

1. Authenticated user opens account dropdown in dashboard
2. User clicks "Change Password"
3. User enters current password
4. User enters new password (meeting requirements)
5. User confirms new password
6. Password updated successfully

## API Endpoints

### Request Password Reset
```typescript
POST /functions/v1/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: {
  "message": "If an account with that email exists, a password reset link has been sent.",
  "dev_reset_link": "http://localhost:5173/reset-password?token=..." // Dev only
}
```

### Reset Password
```typescript
POST /functions/v1/reset-password
Content-Type: application/json

{
  "token": "token-from-email-link",
  "newPassword": "NewSecurePassword123"
}

Response: {
  "message": "Password has been reset successfully. Please login with your new password."
}
```

### Change Password
```typescript
POST /functions/v1/change-password
Content-Type: application/json
Authorization: Bearer <user-jwt-token>

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePassword123"
}

Response: {
  "message": "Password changed successfully"
}
```

## Maintenance

### Database Cleanup Functions

Two maintenance functions are provided:

#### Clean Up Expired Tokens
```sql
SELECT public.cleanup_expired_reset_tokens();
```
Removes expired and used tokens. Run periodically (e.g., daily cron job).

#### Clean Up Old Attempts
```sql
SELECT public.cleanup_old_reset_attempts();
```
Removes reset attempts older than 24 hours. Run periodically.

### Monitoring

Monitor these metrics for security:
- Reset request frequency per email/IP
- Token usage patterns
- Failed reset attempts
- Password change frequency

## Troubleshooting

### Issue: Reset emails not being sent
**Solution**: 
- Verify SMTP configuration in Supabase dashboard
- Check edge function logs: `supabase functions logs request-password-reset`
- In development, use the `dev_reset_link` from the API response

### Issue: Token expired error
**Solution**: Tokens expire after 1 hour. Request a new reset link.

### Issue: Rate limit exceeded
**Solution**: Wait 1 hour before trying again, or contact support if you believe this is an error.

### Issue: Current password incorrect
**Solution**: Use the forgot password flow if you don't remember your current password.

## Testing

### Manual Testing Checklist

**Forgot Password:**
- [ ] Submit with valid email
- [ ] Submit with non-existent email (should show same message)
- [ ] Test rate limiting (4+ attempts)
- [ ] Verify token expiration (after 1 hour)
- [ ] Test token reuse (should fail)

**Reset Password:**
- [ ] Use valid, unexpired token
- [ ] Use expired token (should fail)
- [ ] Use already-used token (should fail)
- [ ] Test password validation rules
- [ ] Verify password confirmation matching
- [ ] Confirm redirect to login after success

**Change Password:**
- [ ] Access without authentication (should redirect)
- [ ] Provide incorrect current password
- [ ] Provide same password as current
- [ ] Test password validation rules
- [ ] Verify successful password change

## Production Checklist

Before deploying to production:

- [ ] Remove `dev_reset_link` from response in `request-password-reset` function
- [ ] Configure proper SMTP settings
- [ ] Customize email templates with branding
- [ ] Set up monitoring and alerting
- [ ] Configure automated cleanup jobs
- [ ] Test all flows in staging environment
- [ ] Review rate limiting settings
- [ ] Enable proper logging and analytics
- [ ] Document incident response procedures

## Future Enhancements

Potential improvements:
- [ ] Two-factor authentication integration
- [ ] Password history (prevent reuse of last N passwords)
- [ ] Account lockout after multiple failed attempts
- [ ] Email verification before password reset
- [ ] SMS-based password reset option
- [ ] Security notifications for password changes
- [ ] Admin panel for managing reset requests
- [ ] Custom password policies per organization

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review edge function logs
3. Check database tables for debugging
4. Contact system administrator

## License

This implementation follows security best practices and industry standards for password management.
