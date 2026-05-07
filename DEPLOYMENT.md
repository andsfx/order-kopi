# Deployment Guide

## Prerequisites

1. **Get Supabase Access Token**
   - Go to https://supabase.com/dashboard/account/tokens
   - Generate a new access token
   - Copy the token

2. **Set Environment Variable**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN='your-token-here'
   ```

3. **Link Project** (if not already linked)
   ```powershell
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

## Deploy Edge Functions

Run the deployment script:
```powershell
.\deploy-functions.ps1
```

This will deploy:
- `verify-payment` (NEW) - Validates payment proof uploads
- `confirm-payment` (UPDATED) - Confirms payment and updates order status
- `auto-cancel` (UPDATED) - Auto-cancels expired pending orders
- `cleanup-old-proofs` (NEW) - Cleans up old payment proofs

## Manual Deployment

If you prefer to deploy functions individually:

```powershell
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy confirm-payment --no-verify-jwt
npx supabase functions deploy auto-cancel --no-verify-jwt
npx supabase functions deploy cleanup-old-proofs --no-verify-jwt
```

## Post-Deployment Steps

1. **Apply Database Migrations**
   ```powershell
   npx supabase db reset
   ```

2. **Create Storage Bucket**
   - Go to Supabase Dashboard → Storage
   - Create bucket: `payment-proofs`
   - Set to **Private**
   - Configure RLS policies (already in migrations)

3. **Upload QRIS Image**
   - Go to Admin Settings in your app
   - Upload your QRIS payment image

4. **Test Payment Flow**
   - Create a test order
   - Upload payment proof
   - Verify auto-confirmation works
   - Check auto-cancel for expired orders

## Troubleshooting

### "Access token not provided"
Set the `SUPABASE_ACCESS_TOKEN` environment variable (see Prerequisites)

### "Project not linked"
Run `npx supabase link --project-ref YOUR_PROJECT_REF`

### Function deployment fails
- Check function code for syntax errors
- Verify Deno dependencies are correct
- Check Supabase logs: `npx supabase functions logs <function-name>`

### Storage bucket issues
- Ensure bucket is created and set to Private
- Verify RLS policies are applied from migrations
- Check bucket permissions in Supabase Dashboard
