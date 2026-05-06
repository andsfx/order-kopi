import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const BulkVerification = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .eq('payment_verified', false)
        .is('payment_proof_url', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleOrder = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAll = () => {
    if (selectedOrders.size === pendingOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(pendingOrders.map(o => o.id)));
    }
  };

  const bulkVerify = async (approve) => {
    if (selectedOrders.size === 0) {
      setError('No orders selected');
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);

    const results = {
      approved: 0,
      rejected: 0,
      failed: []
    };

    try {
      for (const orderId of selectedOrders) {
        try {
          const updates = {
            payment_verified: approve,
            status: approve ? 'confirmed' : 'cancelled',
            verified_at: new Date().toISOString(),
            verified_by: 'admin_bulk',
            auto_verified: false
          };

          const { error: updateError } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId);

          if (updateError) throw updateError;

          if (approve) {
            results.approved++;
          } else {
            results.rejected++;
          }
        } catch (err) {
          results.failed.push({ orderId, error: err.message });
        }
      }

      setSummary(results);
      setSelectedOrders(new Set());
      await loadPendingOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bulk-verification">
      <div className="bulk-header">
        <h2>Bulk Order Verification</h2>
        <div className="bulk-stats">
          <span>{pendingOrders.length} pending orders</span>
          <span>{selectedOrders.size} selected</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {summary && (
        <div className="alert alert-success">
          <h3>Verification Complete</h3>
          <p>✓ {summary.approved} approved</p>
          <p>✗ {summary.rejected} rejected</p>
          {summary.failed.length > 0 && (
            <p>⚠ {summary.failed.length} failed</p>
          )}
        </div>
      )}

      <div className="bulk-actions">
        <button
          onClick={toggleAll}
          className="btn btn-secondary"
          disabled={loading || pendingOrders.length === 0}
        >
          {selectedOrders.size === pendingOrders.length ? 'Deselect All' : 'Select All'}
        </button>
        <button
          onClick={() => bulkVerify(true)}
          className="btn btn-success"
          disabled={loading || selectedOrders.size === 0}
        >
          {loading ? 'Processing...' : `Approve ${selectedOrders.size} Orders`}
        </button>
        <button
          onClick={() => bulkVerify(false)}
          className="btn btn-danger"
          disabled={loading || selectedOrders.size === 0}
        >
          {loading ? 'Processing...' : `Reject ${selectedOrders.size} Orders`}
        </button>
      </div>

      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedOrders.size === pendingOrders.length && pendingOrders.length > 0}
                  onChange={toggleAll}
                  disabled={loading}
                />
              </th>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Created</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {pendingOrders.map(order => (
              <tr key={order.id} className={selectedOrders.has(order.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.id)}
                    onChange={() => toggleOrder(order.id)}
                    disabled={loading}
                  />
                </td>
                <td>{order.id.slice(0, 8)}</td>
                <td>{order.customer_name}</td>
                <td>{formatCurrency(order.total)}</td>
                <td>{new Date(order.created_at).toLocaleString('id-ID')}</td>
                <td>{order.items?.length || 0} items</td>
              </tr>
            ))}
          </tbody>
        </table>

        {pendingOrders.length === 0 && (
          <div className="empty-state">
            <p>No pending orders to verify</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .bulk-verification {
          padding: 20px;
        }

        .bulk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .bulk-stats {
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: #666;
        }

        .bulk-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .alert {
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert-success h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
        }

        .alert-success p {
          margin: 5px 0;
        }

        .orders-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #dee2e6;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
        }

        tr.selected {
          background: #e7f3ff;
        }

        tr:hover {
          background: #f8f9fa;
        }

        tr.selected:hover {
          background: #d0e7ff;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #666;
        }

        input[type="checkbox"] {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  );
};

export default BulkVerification;
