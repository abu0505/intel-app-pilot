# Quick Setup Guide - Password Management System

## 🚀 Quick Start (5 minutes)

### Step 1: Apply Database Migration
```bash
# Navigate to your project directory
cd path/to/intel-app-pilot

# Push the migration to your Supabase database
supabase db push
```

This creates:
- `password_reset_tokens` table
- `password_reset_attempts` table
- Rate limiting functions
- Cleanup functions

### Step 2: Deploy Edge Functions
```bash
# Deploy all three password management functions
supabase functions deploy request-password-reset
supabase functions deploy reset-password
supabase functions deploy change-password
```

### Step 3: Verify Configuration
Check `supabase/config.toml` - it should already have:
```toml
[functions.request-password-reset]
verify_jwt = false

[functions.reset-password]
verify_jwt = false

[functions.change-password]
verify_jwt = true
```

### Step 4: Test the System
```bash
# Start your development server
npm run dev
```

Visit: `http://localhost:5173/auth`
- Click "Forgot password?" link
- Enter your email
- Check console for development reset link
- Follow the reset flow

## ✅ What's Been Implemented

### Frontend Pages (All Created ✅)
- **`/forgot-password`** - Request password reset
- **`/reset-password`** - Set new password with token
- **`/change-password`** - Change password (authenticated users)

### Backend Functions (All Created ✅)
- **`request-password-reset`** - Generate and send reset token
- **`reset-password`** - Validate token and update password
- **`change-password`** - Update password for authenticated users

### Security Features (All Implemented ✅)
- ✅ Rate limiting (3/hour per email, 10/hour per IP)
- ✅ Token expiration (1 hour)
- ✅ One-time use tokens
- ✅ Password strength validation
- ✅ Current password verification
- ✅ Session invalidation on reset
- ✅ Audit logging

### UI Components (All Created ✅)
- ✅ Password strength indicator
- ✅ Show/hide password toggles
- ✅ Requirements checklist
- ✅ Success confirmations
- ✅ Error handling
- ✅ Responsive design

## 🔧 Configuration (Optional)

### Email Setup
To send actual emails (not just development links):

1. Go to Supabase Dashboard
2. Navigate to **Authentication > Email Templates**
3. Configure SMTP settings:
   - SMTP Host
   - SMTP Port
   - SMTP User
   - SMTP Password
4. Customize the password reset email template

### Remove Development Mode
In production, edit `supabase/functions/request-password-reset/index.ts`:

Remove this line (around line 143):
```typescript
dev_reset_link: resetUrl  // Remove this in production
```

## 📱 User Flows

### Forgot Password
1. User visits `/auth` and clicks "Forgot password?"
2. Enters email on `/forgot-password`
3. Receives email with reset link (or console link in dev)
4. Clicks link → redirects to `/reset-password?token=...`
5. Enters new password
6. Redirected to `/auth` to login

### Change Password
1. Authenticated user opens Account dropdown (top-right)
2. Clicks "Change Password"
3. Navigates to `/change-password`
4. Enters current password and new password
5. Password updated, redirected to dashboard

## 🧪 Testing Commands

### Test Database Functions
```sql
-- Check if tables exist
SELECT * FROM password_reset_tokens LIMIT 1;
SELECT * FROM password_reset_attempts LIMIT 1;

-- Test rate limiting function
SELECT check_reset_rate_limit('test@example.com', '192.168.1.1'::inet);

-- Manual cleanup
SELECT cleanup_expired_reset_tokens();
SELECT cleanup_old_reset_attempts();
```

### Test Edge Functions Locally
```bash
# Serve functions locally
supabase functions serve

# Test request-password-reset
curl -X POST http://localhost:54321/functions/v1/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🐛 Common Issues

### Issue: "Cannot find module" errors in edge functions
**Solution**: These are expected TypeScript errors. Edge functions run on Deno, not Node.js. They will work fine when deployed.

### Issue: No email received
**Solution**: 
- In development, check the console for `dev_reset_link`
- In production, verify SMTP configuration
- Check edge function logs: `supabase functions logs request-password-reset`

### Issue: Rate limit exceeded
**Solution**: Wait 1 hour or clear attempts:
```sql
DELETE FROM password_reset_attempts 
WHERE email = 'your@email.com' 
AND attempted_at > now() - interval '1 hour';
```

## 📚 File Structure

```
intel-app-pilot/
├── src/
│   └── pages/
│       ├── Auth.tsx              (Updated with forgot link)
│       ├── ForgotPassword.tsx    (New)
│       ├── ResetPassword.tsx     (New)
│       └── ChangePassword.tsx    (New)
│   └── App.tsx                   (Updated with new routes)
├── supabase/
│   ├── migrations/
│   │   └── 20251027000000_password_reset_tokens.sql
│   ├── functions/
│   │   ├── request-password-reset/index.ts
│   │   ├── reset-password/index.ts
│   │   └── change-password/index.ts
│   └── config.toml               (Updated)
├── PASSWORD_MANAGEMENT.md        (Full documentation)
└── SETUP_PASSWORD_SYSTEM.md      (This file)
```

## 🎯 Next Steps

1. **Deploy Migration**: `supabase db push`
2. **Deploy Functions**: Deploy the three edge functions
3. **Test Locally**: Run dev server and test all flows
4. **Configure Email**: Set up SMTP in production
5. **Remove Dev Mode**: Remove development reset link
6. **Monitor**: Set up logging and monitoring

## 💡 Tips

- Password must have: 8+ chars, uppercase, lowercase, number
- Reset tokens expire in 1 hour
- Tokens can only be used once
- Rate limited to prevent abuse
- All sessions logged out on password reset
- Change password requires current password

## 🔒 Security Notes

- Never commit `.env` file with real credentials
- Always use HTTPS in production
- Regularly run cleanup functions
- Monitor for unusual reset patterns
- Keep Supabase and dependencies updated

## Need Help?

Refer to `PASSWORD_MANAGEMENT.md` for:
- Detailed architecture
- API documentation
- Troubleshooting guide
- Production checklist
- Security best practices

---

**Status**: ✅ All components implemented and ready for deployment
**Last Updated**: October 27, 2025
