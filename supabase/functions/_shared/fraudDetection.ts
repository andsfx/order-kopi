import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface FraudCheckResult {
  fraudScore: number;
  needsReview: boolean;
  reasons: string[];
}

/**
 * Check for fraudulent patterns in payment verification
 * @param supabaseClient - Supabase client instance
 * @param orderId - Order ID being verified
 * @param sessionToken - Customer session token
 * @param customerName - Customer name from order
 * @param amountEntered - Amount entered by customer
 * @param expectedAmount - Expected amount (total + unique_code)
 * @param paymentProofUrl - Optional payment proof URL for duplicate detection
 * @returns Fraud check result with score and reasons
 */
export async function checkFraud(
  supabaseClient: any,
  orderId: string,
  sessionToken: string,
  customerName: string,
  amountEntered: number,
  expectedAmount: number,
  paymentProofUrl?: string
): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let fraudScore = 0;

  // Check 1: Count auto-verified orders from same session_token in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: sessionOrders, error: sessionError } = await supabaseClient
    .from('orders')
    .select('id')
    .eq('session_token', sessionToken)
    .eq('auto_verified', true)
    .gte('created_at', sevenDaysAgo.toISOString())
    .neq('id', orderId); // Exclude current order

  if (!sessionError && sessionOrders) {
    const sessionCount = sessionOrders.length;
    if (sessionCount >= 3) {
      fraudScore += 40;
      reasons.push(`${sessionCount} auto-verified orders from same session in 7 days`);
    } else if (sessionCount >= 2) {
      fraudScore += 20;
      reasons.push(`${sessionCount} auto-verified orders from same session in 7 days`);
    }
  }

  // Check 2: Count auto-verified orders from same customer_name in last 7 days
  const { data: nameOrders, error: nameError } = await supabaseClient
    .from('orders')
    .select('id')
    .ilike('customer_name', customerName)
    .eq('auto_verified', true)
    .gte('created_at', sevenDaysAgo.toISOString())
    .neq('id', orderId);

  if (!nameError && nameOrders) {
    const nameCount = nameOrders.length;
    if (nameCount >= 3) {
      fraudScore += 30;
      reasons.push(`${nameCount} auto-verified orders from same name in 7 days`);
    } else if (nameCount >= 2) {
      fraudScore += 15;
      reasons.push(`${nameCount} auto-verified orders from same name in 7 days`);
    }
  }

  // Check 3: Suspiciously round amount (exactly order.total without unique code)
  // This would mean amountEntered is much less than expected
  const amountDiff = Math.abs(amountEntered - expectedAmount);
  if (amountDiff > 100) {
    fraudScore += 50;
    reasons.push(`Amount entered (${amountEntered}) differs significantly from expected (${expectedAmount})`);
  }

  // Check 4: Check if amount is suspiciously round (e.g., 50000 instead of 50123)
  const isRound = amountEntered % 1000 === 0;
  if (isRound && amountDiff > 10) {
    fraudScore += 20;
    reasons.push('Amount is suspiciously round number');
  }

  // Check 5: Duplicate payment proof detection (same proof used multiple times)
  if (paymentProofUrl) {
    const { data: duplicateProofs, error: proofError } = await supabaseClient
      .from('orders')
      .select('id, customer_name')
      .eq('payment_proof_url', paymentProofUrl)
      .neq('id', orderId);

    if (!proofError && duplicateProofs && duplicateProofs.length > 0) {
      fraudScore += 60;
      reasons.push(`Payment proof used in ${duplicateProofs.length} other order(s)`);
    }
  }

  // Check 6: Rapid order submissions (>5 orders in 10 minutes from same session)
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  const { data: recentOrders, error: recentError } = await supabaseClient
    .from('orders')
    .select('id, created_at')
    .eq('session_token', sessionToken)
    .gte('created_at', tenMinutesAgo.toISOString())
    .neq('id', orderId);

  if (!recentError && recentOrders) {
    const rapidCount = recentOrders.length;
    if (rapidCount >= 5) {
      fraudScore += 50;
      reasons.push(`${rapidCount} orders submitted in last 10 minutes`);
    } else if (rapidCount >= 3) {
      fraudScore += 25;
      reasons.push(`${rapidCount} orders submitted in last 10 minutes`);
    }
  }

  // Check 7: Suspicious amount patterns (always exact match across multiple orders)
  const { data: amountOrders, error: amountError } = await supabaseClient
    .from('orders')
    .select('id, total, amount_entered')
    .eq('session_token', sessionToken)
    .eq('auto_verified', true)
    .gte('created_at', sevenDaysAgo.toISOString())
    .neq('id', orderId);

  if (!amountError && amountOrders && amountOrders.length >= 2) {
    // Check if all amounts are exactly matching (no variation in unique codes)
    const allExactMatch = amountOrders.every((order: any) => 
      order.amount_entered === order.total + (order.amount_entered - order.total)
    );
    
    // Check if amounts are suspiciously similar (within 5 rupiah)
    const amounts = amountOrders.map((o: any) => o.amount_entered);
    const avgAmount = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
    const maxDeviation = Math.max(...amounts.map((a: number) => Math.abs(a - avgAmount)));
    
    if (maxDeviation < 5 && amounts.length >= 3) {
      fraudScore += 30;
      reasons.push(`Suspicious pattern: ${amounts.length} orders with nearly identical amounts`);
    }
  }

  // Determine if manual review is needed
  const needsReview = fraudScore >= 50;

  return {
    fraudScore: Math.min(fraudScore, 100), // Cap at 100
    needsReview,
    reasons,
  };
}
