import { describe, it, expect } from 'vitest';
import { isFeatureEnabled, getEnabledFeatures } from '../src/config/featureFlags';

describe('Feature Flags', () => {
  describe('isFeatureEnabled', () => {
    it('should return true for enabled features without admin requirement', () => {
      expect(isFeatureEnabled('enhancedFraudDetection')).toBe(true);
      expect(isFeatureEnabled('storageOptimization')).toBe(true);
      expect(isFeatureEnabled('webpSupport')).toBe(true);
    });

    it('should return false for non-existent features', () => {
      expect(isFeatureEnabled('nonExistentFeature')).toBe(false);
    });

    it('should respect admin-only flags', () => {
      const regularUser = { id: 'user-1', isAdmin: false };
      const adminUser = { id: 'admin-1', isAdmin: true };

      expect(isFeatureEnabled('bulkVerification', regularUser)).toBe(false);
      expect(isFeatureEnabled('bulkVerification', adminUser)).toBe(true);
      
      expect(isFeatureEnabled('paymentAnalytics', regularUser)).toBe(false);
      expect(isFeatureEnabled('paymentAnalytics', adminUser)).toBe(true);
    });
  });

  describe('getEnabledFeatures', () => {
    it('should return correct features for regular user', () => {
      const regularUser = { id: 'user-1', isAdmin: false };
      const enabled = getEnabledFeatures(regularUser);

      expect(enabled.enhancedFraudDetection).toBe(true);
      expect(enabled.storageOptimization).toBe(true);
      expect(enabled.bulkVerification).toBe(false); // Admin only
      expect(enabled.paymentAnalytics).toBe(false); // Admin only
    });

    it('should return correct features for admin user', () => {
      const adminUser = { id: 'admin-1', isAdmin: true };
      const enabled = getEnabledFeatures(adminUser);

      expect(enabled.enhancedFraudDetection).toBe(true);
      expect(enabled.storageOptimization).toBe(true);
      expect(enabled.bulkVerification).toBe(true);
      expect(enabled.paymentAnalytics).toBe(true);
    });
  });

  describe('Individual Feature Flags', () => {
    it('should have all low priority features enabled', () => {
      expect(isFeatureEnabled('duplicateProofDetection')).toBe(true);
      expect(isFeatureEnabled('rapidSubmissionDetection')).toBe(true);
      expect(isFeatureEnabled('amountPatternDetection')).toBe(true);
      expect(isFeatureEnabled('webpSupport')).toBe(true);
      expect(isFeatureEnabled('progressiveJpeg')).toBe(true);
      expect(isFeatureEnabled('qualitySlider')).toBe(true);
    });
  });
});
