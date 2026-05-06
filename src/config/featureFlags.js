/**
 * Feature Flags Configuration
 * 
 * Controls gradual rollout of new features.
 * Set to true to enable, false to disable.
 */

const featureFlags = {
  // Enhanced Fraud Detection
  enhancedFraudDetection: {
    enabled: true,
    description: 'Advanced fraud detection with duplicate proof, rapid submission, and pattern detection',
    rolloutPercentage: 100, // 0-100
  },

  // Bulk Verification
  bulkVerification: {
    enabled: true,
    description: 'Admin bulk order verification interface',
    rolloutPercentage: 100,
    adminOnly: true,
  },

  // Payment Analytics
  paymentAnalytics: {
    enabled: true,
    description: 'Auto-verification success rate and fraud analytics dashboard',
    rolloutPercentage: 100,
    adminOnly: true,
  },

  // Storage Optimization
  storageOptimization: {
    enabled: true,
    description: 'WebP format, progressive JPEG, and quality controls for payment proofs',
    rolloutPercentage: 100,
  },

  // Individual sub-features
  webpSupport: {
    enabled: true,
    description: 'WebP format support for payment proofs',
    rolloutPercentage: 100,
  },

  progressiveJpeg: {
    enabled: true,
    description: 'Progressive JPEG encoding for faster loading',
    rolloutPercentage: 100,
  },

  qualitySlider: {
    enabled: true,
    description: 'User-adjustable image quality slider',
    rolloutPercentage: 100,
  },

  duplicateProofDetection: {
    enabled: true,
    description: 'Detect same payment proof used multiple times',
    rolloutPercentage: 100,
  },

  rapidSubmissionDetection: {
    enabled: true,
    description: 'Detect rapid order submissions (>5 in 10 minutes)',
    rolloutPercentage: 100,
  },

  amountPatternDetection: {
    enabled: true,
    description: 'Detect suspicious amount patterns',
    rolloutPercentage: 100,
  },
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature flag
 * @param {object} user - Optional user object for admin checks
 * @returns {boolean} - Whether the feature is enabled
 */
export const isFeatureEnabled = (featureName, user = null) => {
  const feature = featureFlags[featureName];
  
  if (!feature) {
    console.warn(`Feature flag "${featureName}" not found`);
    return false;
  }

  // Check if feature is enabled
  if (!feature.enabled) {
    return false;
  }

  // Check admin-only features
  if (feature.adminOnly && (!user || !user.isAdmin)) {
    return false;
  }

  // Check rollout percentage (simple random-based rollout)
  if (feature.rolloutPercentage < 100) {
    // Use consistent hash based on user ID or session
    const userId = user?.id || 'anonymous';
    const hash = hashString(userId);
    const userPercentage = hash % 100;
    
    if (userPercentage >= feature.rolloutPercentage) {
      return false;
    }
  }

  return true;
};

/**
 * Simple string hash function for consistent rollout
 * @param {string} str - String to hash
 * @returns {number} - Hash value
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Get all enabled features
 * @param {object} user - Optional user object
 * @returns {object} - Object with feature names as keys and boolean values
 */
export const getEnabledFeatures = (user = null) => {
  const enabled = {};
  
  for (const [featureName, feature] of Object.entries(featureFlags)) {
    enabled[featureName] = isFeatureEnabled(featureName, user);
  }
  
  return enabled;
};

/**
 * Get feature flag configuration (for admin dashboard)
 * @returns {object} - All feature flags with metadata
 */
export const getFeatureFlags = () => {
  return { ...featureFlags };
};

/**
 * Update feature flag (for admin dashboard)
 * Note: In production, this should be stored in database
 * @param {string} featureName - Name of the feature flag
 * @param {object} updates - Updates to apply
 */
export const updateFeatureFlag = (featureName, updates) => {
  if (!featureFlags[featureName]) {
    throw new Error(`Feature flag "${featureName}" not found`);
  }

  featureFlags[featureName] = {
    ...featureFlags[featureName],
    ...updates,
  };

  // In production, persist to database
  console.log(`Feature flag "${featureName}" updated:`, updates);
};

export default featureFlags;
