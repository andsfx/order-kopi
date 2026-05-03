# Cashi.id Deployment Script
# Run this script to deploy Edge Functions to Supabase

Write-Host "🚀 Deploying Cashi.id Integration to Supabase..." -ForegroundColor Green
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = npx supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}
Write-Host "✅ Supabase CLI ready" -ForegroundColor Green
Write-Host ""

# Link project
Write-Host "Linking to Supabase project..." -ForegroundColor Yellow
npx supabase link --project-ref kmmxfqqpoipeqdcvtljv
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link project. Please login first:" -ForegroundColor Red
    Write-Host "   npx supabase login" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

# Set secrets
Write-Host "Setting environment variables..." -ForegroundColor Yellow
npx supabase secrets set CASHI_API_KEY=CASHI-1AKE5VR2PAD
npx supabase secrets set CASHI_WEBHOOK_SECRET=sk_02ee564329393b25a5ea0b56bb4e7cb6
Write-Host "✅ Secrets configured" -ForegroundColor Green
Write-Host ""

# Deploy create-cashi-payment function
Write-Host "Deploying create-cashi-payment function..." -ForegroundColor Yellow
npx supabase functions deploy create-cashi-payment --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy create-cashi-payment" -ForegroundColor Red
    exit 1
}
Write-Host "✅ create-cashi-payment deployed" -ForegroundColor Green
Write-Host ""

# Deploy cashi-webhook function
Write-Host "Deploying cashi-webhook function..." -ForegroundColor Yellow
npx supabase functions deploy cashi-webhook --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy cashi-webhook" -ForegroundColor Red
    exit 1
}
Write-Host "✅ cashi-webhook deployed" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Setup webhook di Cashi.id dashboard:" -ForegroundColor White
Write-Host "   URL: https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test payment flow:" -ForegroundColor White
Write-Host "   - Buka https://order-kopi-app.netlify.app" -ForegroundColor Yellow
Write-Host "   - Order dengan QRIS" -ForegroundColor Yellow
Write-Host "   - Scan & bayar" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Monitor logs:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/kmmxfqqpoipeqdcvtljv/functions" -ForegroundColor Yellow
