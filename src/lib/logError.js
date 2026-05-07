import { supabase } from './supabase';

/**
 * Log a client-side error to Supabase error_logs table.
 * Fire-and-forget — never blocks or throws.
 *
 * @param {Error} error
 * @param {object} [extra]
 * @param {string} [extra.componentStack] - React component stack from ErrorBoundary
 * @param {object} [extra.metadata] - Any extra key-value pairs
 */
export function logError(error, extra = {}) {
  if (!error) return;

  // Always log to console
  console.error('[logError]', error, extra);

  // Parse UA once
  const ua = navigator.userAgent;
  const browser = parseBrowser(ua);
  const os = parseOS(ua);
  const device = /Mobi|Android/i.test(ua) ? 'Mobile' : 'Desktop';

  const row = {
    message: error.message || String(error),
    stack: error.stack || null,
    component_stack: extra.componentStack || null,
    url: window.location.href,
    line: error.lineNumber || null,
    col: error.columnNumber || null,
    browser,
    os,
    device,
    environment: import.meta.env.MODE,
    user_agent: ua,
    metadata: extra.metadata || {},
    page_path: window.location.pathname,
  };

  // Fire-and-forget insert
  supabase.from('error_logs').insert(row).then(({ error: insertError }) => {
    if (insertError) {
      console.error('[logError] Failed to write error_logs:', insertError.message);
    }
  });
}

/**
 * Install global unhandled error/rejection handlers.
 * Call once at app startup.
 */
export function installGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      metadata: { type: 'unhandled_error', filename: event.filename },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logError(reason instanceof Error ? reason : new Error(String(reason)), {
      metadata: { type: 'unhandled_promise_rejection' },
    });
  });
}

// --- Simple UA parsers (no dependency needed) ---

function parseBrowser(ua) {
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  return 'Unknown';
}

function parseOS(ua) {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}
