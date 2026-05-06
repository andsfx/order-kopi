import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PaymentAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    autoVerificationRate: 0,
    avgVerificationTime: 0,
    fraudDetectionRate: 0,
    manualReviewRate: 0,
    totalOrders: 0,
    autoVerified: 0,
    manualVerified: 0,
    fraudDetected: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = getStartDate(dateRange);

      // Get all orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .in('status', ['confirmed', 'cancelled']);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setAnalytics({
          autoVerificationRate: 0,
          avgVerificationTime: 0,
          fraudDetectionRate: 0,
          manualReviewRate: 0,
          totalOrders: 0,
          autoVerified: 0,
          manualVerified: 0,
          fraudDetected: 0
        });
        setLoading(false);
        return;
      }

      // Calculate metrics
      const totalOrders = orders.length;
      const autoVerified = orders.filter(o => o.auto_verified === true).length;
      const manualVerified = orders.filter(o => o.auto_verified === false && o.payment_verified === true).length;
      const fraudDetected = orders.filter(o => o.fraud_score >= 50).length;

      // Calculate average verification time (in minutes)
      const verificationTimes = orders
        .filter(o => o.verified_at && o.created_at)
        .map(o => {
          const created = new Date(o.created_at);
          const verified = new Date(o.verified_at);
          return (verified - created) / 1000 / 60; // Convert to minutes
        });

      const avgVerificationTime = verificationTimes.length > 0
        ? verificationTimes.reduce((a, b) => a + b, 0) / verificationTimes.length
        : 0;

      // Calculate rates
      const autoVerificationRate = totalOrders > 0 ? (autoVerified / totalOrders) * 100 : 0;
      const fraudDetectionRate = totalOrders > 0 ? (fraudDetected / totalOrders) * 100 : 0;
      const manualReviewRate = totalOrders > 0 ? (manualVerified / totalOrders) * 100 : 0;

      setAnalytics({
        autoVerificationRate,
        avgVerificationTime,
        fraudDetectionRate,
        manualReviewRate,
        totalOrders,
        autoVerified,
        manualVerified,
        fraudDetected
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range) => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  };

  const getStatusColor = (rate) => {
    if (rate >= 80) return '#28a745';
    if (rate >= 60) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="payment-analytics">
      <div className="analytics-header">
        <h2>Payment Verification Analytics</h2>
        <div className="date-range-selector">
          <button
            className={dateRange === '24h' ? 'active' : ''}
            onClick={() => setDateRange('24h')}
          >
            24h
          </button>
          <button
            className={dateRange === '7d' ? 'active' : ''}
            onClick={() => setDateRange('7d')}
          >
            7d
          </button>
          <button
            className={dateRange === '30d' ? 'active' : ''}
            onClick={() => setDateRange('30d')}
          >
            30d
          </button>
          <button
            className={dateRange === '90d' ? 'active' : ''}
            onClick={() => setDateRange('90d')}
          >
            90d
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🤖</div>
          <div className="metric-content">
            <h3>Auto-Verification Rate</h3>
            <div className="metric-value" style={{ color: getStatusColor(analytics.autoVerificationRate) }}>
              {analytics.autoVerificationRate.toFixed(1)}%
            </div>
            <div className="metric-detail">
              {analytics.autoVerified} of {analytics.totalOrders} orders
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Avg Verification Time</h3>
            <div className="metric-value">
              {formatTime(analytics.avgVerificationTime)}
            </div>
            <div className="metric-detail">
              From order to verification
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🛡️</div>
          <div className="metric-content">
            <h3>Fraud Detection Rate</h3>
            <div className="metric-value" style={{ color: analytics.fraudDetectionRate > 5 ? '#dc3545' : '#28a745' }}>
              {analytics.fraudDetectionRate.toFixed(1)}%
            </div>
            <div className="metric-detail">
              {analytics.fraudDetected} suspicious orders
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">👤</div>
          <div className="metric-content">
            <h3>Manual Review Rate</h3>
            <div className="metric-value">
              {analytics.manualReviewRate.toFixed(1)}%
            </div>
            <div className="metric-detail">
              {analytics.manualVerified} manual verifications
            </div>
          </div>
        </div>
      </div>

      <div className="insights-section">
        <h3>Insights</h3>
        <div className="insights-list">
          {analytics.autoVerificationRate >= 80 && (
            <div className="insight success">
              ✓ Excellent auto-verification rate! System is working efficiently.
            </div>
          )}
          {analytics.autoVerificationRate < 60 && (
            <div className="insight warning">
              ⚠ Low auto-verification rate. Consider reviewing fraud detection thresholds.
            </div>
          )}
          {analytics.avgVerificationTime < 5 && (
            <div className="insight success">
              ✓ Fast verification times! Customers are getting quick confirmations.
            </div>
          )}
          {analytics.avgVerificationTime > 30 && (
            <div className="insight warning">
              ⚠ High verification times. Consider optimizing the verification process.
            </div>
          )}
          {analytics.fraudDetectionRate > 10 && (
            <div className="insight danger">
              ⚠ High fraud detection rate. Review security measures and patterns.
            </div>
          )}
          {analytics.fraudDetectionRate < 2 && analytics.totalOrders > 50 && (
            <div className="insight success">
              ✓ Low fraud rate indicates healthy order quality.
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .payment-analytics {
          padding: 20px;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .date-range-selector {
          display: flex;
          gap: 5px;
          background: #f8f9fa;
          padding: 4px;
          border-radius: 8px;
        }

        .date-range-selector button {
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .date-range-selector button.active {
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .date-range-selector button:hover {
          background: white;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          gap: 16px;
          transition: transform 0.2s;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .metric-icon {
          font-size: 36px;
          line-height: 1;
        }

        .metric-content {
          flex: 1;
        }

        .metric-content h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1;
        }

        .metric-detail {
          font-size: 12px;
          color: #999;
        }

        .insights-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .insights-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .insight {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }

        .insight.success {
          background: #d4edda;
          color: #155724;
          border-left: 4px solid #28a745;
        }

        .insight.warning {
          background: #fff3cd;
          color: #856404;
          border-left: 4px solid #ffc107;
        }

        .insight.danger {
          background: #f8d7da;
          color: #721c24;
          border-left: 4px solid #dc3545;
        }

        .alert {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default PaymentAnalytics;
