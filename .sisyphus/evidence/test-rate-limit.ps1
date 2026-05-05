# Test rate limiting for create-cashi-payment Edge Function
# Expected: First 10 requests succeed (200), next 5 fail (429)

$url = "http://localhost:54321/functions/v1/create-cashi-payment"
$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $env:SUPABASE_ANON_KEY
}

$body = @{
    order_id = "test-order-$(Get-Random)"
    amount = 10000
    customer_name = "Rate Limit Test"
} | ConvertTo-Json

Write-Host "Sending 15 requests to test rate limiting..." -ForegroundColor Cyan
Write-Host "Expected: First 10 succeed (200), next 5 fail (429)`n" -ForegroundColor Yellow

$results = @()

for ($i = 1; $i -le 15; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
        $status = $response.StatusCode
        $results += "Request $i : HTTP $status (Success)"
        Write-Host "Request $i : HTTP $status" -ForegroundColor Green
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $results += "Request $i : HTTP $status (Rate Limited)"
        Write-Host "Request $i : HTTP $status" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
$results | ForEach-Object { Write-Host $_ }

$successCount = ($results | Where-Object { $_ -match "200" }).Count
$rateLimitedCount = ($results | Where-Object { $_ -match "429" }).Count

Write-Host "`nSuccess: $successCount" -ForegroundColor Green
Write-Host "Rate Limited: $rateLimitedCount" -ForegroundColor Red

if ($successCount -eq 10 -and $rateLimitedCount -eq 5) {
    Write-Host "`n✓ PASS: Rate limiting works correctly!" -ForegroundColor Green
} else {
    Write-Host "`n✗ FAIL: Expected 10 success and 5 rate limited" -ForegroundColor Red
}
