import { useToastStore } from '../stores/useToastStore.js';

// Show a toast when Reddit rate-limits us (429). 2s timer.
function notifyRateLimited() {
  try {
    const toast = useToastStore();
    toast.push('Rate limited by Reddit — slow down', 'error', 2000);
  } catch {
    // ignore
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    // Send httpOnly auth cookie with every request
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // On 429 (rate limited by Reddit), notify the user
    if (res.status === 429) {
      notifyRateLimited();
    }
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

// Proxy a Reddit image URL through the backend to bypass hotlink protection.
// The backend validates the host against its allowlist and rejects bad ones.
export function proxyImage(url) {
  if (!url) return url;
  if (/^https:\/\/([a-z0-9-]+\.)*(redd\.it|reddit\.com|redditmedia\.com)\//.test(url)) {
    return `/api/reddit/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
