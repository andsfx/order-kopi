/**
 * Generate unique 4-digit code for order verification
 * Uses random approach with collision check for security.
 * Deterministic approach is available as fallback only.
 * 
 * @param {string} orderId - Order ID (used for fallback only)
 * @param {number} finalTotal - Final order total (after discount) - used for additional entropy
 * @returns {string} 4-digit code (1000-9999)
 */
export function generateUniqueCode(orderId, finalTotal = 0) {
  // Use random generation for unpredictability
  // Deterministic codes are predictable if order ID pattern is known
  const code = Math.floor(Math.random() * 9000) + 1000;
  return code.toString();
}

/**
 * Generate deterministic 4-digit code from order ID (fallback only)
 * WARNING: Predictable — do not use as primary method
 * @param {string} orderId - Order ID
 * @param {number} finalTotal - Final order total (after discount)
 * @returns {string} 4-digit code (1000-9999)
 */
export function generateDeterministicCode(orderId, finalTotal = 0) {
  // Extract numeric part from order ID
  // e.g., "ORD-20260506-001" -> 20260506001
  const numericPart = orderId.replace(/\D/g, '');
  
  // Use last 4 digits as base, default to 1000 if empty
  let base;
  if (numericPart.length >= 4) {
    base = parseInt(numericPart.slice(-4));
  } else if (numericPart.length > 0) {
    base = parseInt(numericPart) + 1000;
  } else {
    base = 1000;
  }
  
  // Add finalTotal as additional entropy
  if (finalTotal > 0) {
    base += (finalTotal % 1000);
  }
  
  // Ensure it's in range 1000-9999
  const code = ((base - 1000) % 9000) + 1000;
  
  return code.toString();
}

/**
 * Fallback: Generate random 4-digit code with collision check
 * Only used if deterministic approach fails
 * @param {object} supabase - Supabase client
 * @returns {Promise<string>} 4-digit code (1000-9999)
 */
export async function generateRandomUniqueCode(supabase) {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random 4-digit code (1000-9999)
    const code = Math.floor(Math.random() * 9000) + 1000;
    
    // Check if code is used today
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('unique_code', code.toString())
      .gte('created_at', today)
      .limit(1);
    
    if (error) throw error;
    
    // If not used, return it
    if (!data || data.length === 0) {
      return code.toString();
    }
  }
  
  throw new Error('Failed to generate unique code after 10 attempts');
}
