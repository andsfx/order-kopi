QA Evidence: README.md Cashi.id Integration

Test 1: Verify Cashi.id section exists
Command: grep -i "cashi" README.md
Result: 7 matches found
✓ PASS - Cashi.id mentioned multiple times throughout README

Test 2: Verify CASHI_API_KEY documentation
Command: grep "CASHI_API_KEY" README.md
Result: 3 matches found
- Environment variable definition
- Usage explanation (frontend)
- Troubleshooting reference
✓ PASS - CASHI_API_KEY properly documented

Test 3: Verify CASHI_WEBHOOK_SECRET documentation
Command: grep "CASHI_WEBHOOK_SECRET" README.md
Result: 4 matches found
- Environment variable definition
- Usage explanation (backend/Edge Function)
- Troubleshooting references (2x)
✓ PASS - CASHI_WEBHOOK_SECRET properly documented

Test 4: Verify webhook URL documentation
Command: grep "cashi-webhook" README.md
Result: 3 matches found
- Webhook URL configuration
- Deploy command
- Logs command
✓ PASS - Webhook setup properly documented

Test 5: Verify link to official docs
Command: grep "cashi.id/doc" README.md
Result: 1 match found
- Link to official Cashi.id documentation
✓ PASS - External documentation link present

Summary:
✓ All required sections present
✓ Setup steps documented
✓ Environment variables documented
✓ Webhook configuration documented
✓ Troubleshooting section added
✓ Link to official docs included
✓ Payment section updated to mention dynamic QRIS

Status: ALL TESTS PASSED
