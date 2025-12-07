# Email Verification Setup Guide

This guide explains how to configure email verification in Supabase for development and testing.

## Problem: Not Receiving Verification Emails

If you're not receiving verification emails during testing, there are several solutions:

## Solution 1: Disable Email Confirmation (Recommended for Development)

For local development and testing, you can disable email confirmation requirements:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Settings**
4. Scroll to **Email Auth** section
5. **Uncheck** "Enable email confirmations"
6. Save changes

**Note**: Users will be able to sign in immediately after sign-up without email verification.

## Solution 2: Use Supabase's Email Testing

Supabase provides email testing in development:

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. When a user signs up, check the **Users** table
3. Click on the user to see their details
4. Look for email verification links in the user's metadata or logs

## Solution 3: Configure Email Redirect URLs

If you want to use email verification, configure redirect URLs:

1. Go to **Authentication** → **URL Configuration**
2. Add your app's redirect URL:
   - For Expo Go: `exp://localhost:8081`
   - For development build: Your custom scheme (e.g., `momentroulette://`)
   - For production: Your app's deep link URL

3. Add Site URL: `http://localhost:3000` (or your web URL)

## Solution 4: Use Resend Verification Email Feature

The app now includes a "Resend Email" button that appears after sign-up:

1. Sign up with your email
2. If you don't receive the email, click "Resend Email"
3. Check your inbox (and spam folder)

## Solution 5: Check Supabase Email Logs

1. Go to **Authentication** → **Users**
2. Find your user account
3. Check the **Audit Logs** tab to see if emails were sent
4. Look for any errors in email delivery

## Testing Email Verification Flow

### With Email Confirmation Enabled:

1. Sign up with an email address
2. Check your email inbox (and spam folder)
3. Click the verification link in the email
4. The link will redirect to your app
5. You can now sign in

### With Email Confirmation Disabled:

1. Sign up with an email address
2. You can sign in immediately (no email verification needed)
3. User is automatically confirmed

## Production Considerations

For production:

1. **Enable email confirmations** in Supabase settings
2. Configure proper **Site URL** and **Redirect URLs**
3. Set up a custom email template (optional)
4. Consider using a custom SMTP provider for better deliverability
5. Monitor email delivery rates in Supabase logs

## Troubleshooting

### Emails Not Sending

- Check Supabase project status (free tier has email limits)
- Verify email service is enabled in Supabase Dashboard
- Check spam/junk folder
- Verify email address is valid
- Check Supabase logs for errors

### Verification Link Not Working

- Ensure redirect URLs are configured correctly
- Check that your app handles deep links properly
- Verify the link hasn't expired (usually valid for 24 hours)

### User Can't Sign In After Verification

- Check if email confirmation is required in Supabase settings
- Verify user's `email_confirmed_at` field is set
- Check for any RLS policies that might block access

## App Features

The app includes:

- **Resend verification email** button (appears after sign-up)
- **Clear error messages** for email verification issues
- **Automatic detection** of email verification requirement
- **Development mode hints** in the UI

## Quick Fix for Development

**Fastest solution for testing:**

1. Disable email confirmations in Supabase Dashboard
2. Users can sign in immediately after sign-up
3. Re-enable for production when ready

This is the recommended approach for development and testing.

