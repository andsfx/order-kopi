/**
 * Generate unique code (0-500) for order verification
 * Uses random approach for security.
 * 
 * @param {string} orderId - Order ID (unused, kept for API compat)
 * @param {number} finalTotal - Final order total (unused, kept for API compat)
 * @returns {string} 1-3 digit code (0-500)
 */
export function generateUniqueCode(orderId, finalTotal = 0) {
  const code = Math.floor(Math.random() * 501);
  return code.toString();
}

/**
 * Generate deterministic code from order ID (fallback only)
 * WARNING: Predictable — do not use as primary method
 * @param {string} orderId - Order ID
 * @param {number} finalTotal - Final order total (after discount)
 * @returns {string} 1-3 digit code (0-500)
 */
export function generateDeterministicCode(orderId, finalTotal = 0) {
  const numericPart = orderId.replace(/\D/g, '');
  let base = numericPart.length > 0 ? parseInt(numericPart.slice(-3)) : 0;
  if (finalTotal > 0) {
    base += (finalTotal % 100);
  }
  const code = base % 501;
  return code.toString();
}

/**
 * Fallback: Generate random code with collision check
 * @param {object} supabase - Supabase client
 * @returns {Promise<string>} 1-3 digit code (0-500)
 */
export async function generateRandomUniqueCode(supabase) {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = Math.floor(Math.random() * 501);
    
    // Check if code is used today
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('unique_code', code.toString())
      .gte('created_at', today)
      .limit(1);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return code.toString();
    }
  }
  
  throw new Error('Failed to generate unique code after 10 attempts');
}
