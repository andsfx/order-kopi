#!/usr/bin/env pwsh
# Deploy Edge Functions to Supabase

Write-Host "Deploying Edge Functions to Supabase..." -ForegroundColor Cyan
Write-Host ""

# Check if SUPABASE_ACCESS_TOKEN is set
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "ERROR: SUPABASE_ACCESS_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your access token:" -ForegroundColor Yellow
    Write-Host "1. Go to https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    Write-Host "2. Generate a new access token" -ForegroundColor Yellow
    Write-Host "3. Set it as an environment variable:" -ForegroundColor Yellow
    Write-Host "   `$env:SUPABASE_ACCESS_TOKEN='your-token-here'" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Check if project is linked
if (!(Test-Path "supabase\.temp\project-ref")) {
    Write-Host "ERROR: Project not linked. Please run:" -ForegroundColor Red
    Write-Host "   npx supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Yellow
    exit 1
}

$projectRef = Get-Content "supabase\.temp\project-ref"
Write-Host "Project: $projectRef" -ForegroundColor Green
Write-Host ""

# Functions to deploy
$functions = @(
    "verify-payment",
    "confirm-payment", 
    "auto-cancel",
    "cleanup-old-proofs"
)

$success = 0
$failed = 0

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    
    try {
        npx supabase functions deploy $func --no-verify-jwt
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   SUCCESS: $func deployed successfully" -ForegroundColor Green
            $success++
        } else {
            Write-Host "   ERROR: $func deployment failed" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "   ERROR: Error deploying $func : $_" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "   Success: $success" -ForegroundColor Green
Write-Host "   Failed: $failed" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "All Edge Functions deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Apply database migrations: npx supabase db reset" -ForegroundColor Yellow
    Write-Host "2. Create storage bucket: payment-proofs (private)" -ForegroundColor Yellow
    Write-Host "3. Upload QRIS image via Admin Settings" -ForegroundColor Yellow
    Write-Host "4. Test payment flow" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "WARNING: Some deployments failed. Check errors above." -ForegroundColor Yellow
    exit 1
}
