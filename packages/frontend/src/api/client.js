const TOKEN_KEY = 'signal_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // On 401, clear the expired token (session ended)
    if (res.status === 401) {
      setToken(null);
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
