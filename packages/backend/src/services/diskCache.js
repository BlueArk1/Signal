import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Data dir overridable via DATA_DIR (e.g. Docker volume mount)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const BUDGET_BYTES = Number(process.env.REDDIT_CACHE_BUDGET_MB || 1024) * 1024 * 1024; // default 1 GB

// Track total size + LRU order in memory (index only, not post data)
let totalBytes = 0;
const lru = new Map(); // key -> { size, expiresAt }

function filePath(key) {
  const safe = key.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

function loadIndex() {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const p = path.join(CACHE_DIR, f);
      let stat;
      try {
        stat = fs.statSync(p);
      } catch {
        continue;
      }
      let key = null;
      let expiresAt = 0;
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        // Real key is stored inside the payload (filenames are lossy)
        key = parsed?.key || null;
        expiresAt = parsed?.expiresAt || 0;
      } catch {
        // unreadable -> skip
      }
      if (!key) continue;
      totalBytes += stat.size;
      lru.set(key, { size: stat.size, expiresAt });
    }
  } catch {
    // ignore
  }
}

function evictIfNeeded(extraBytes) {
  while (totalBytes + extraBytes > BUDGET_BYTES && lru.size > 0) {
    const oldestKey = lru.keys().next().value;
    const entry = lru.get(oldestKey);
    try {
      fs.unlinkSync(filePath(oldestKey));
    } catch {
      // ignore
    }
    totalBytes -= entry.size;
    lru.delete(oldestKey);
  }
}

export function diskCacheGet(key) {
  const entry = lru.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    diskCacheDelete(key);
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(key), 'utf8'));
    // refresh LRU recency
    lru.delete(key);
    lru.set(key, entry);
    return parsed.data;
  } catch {
    diskCacheDelete(key);
    return null;
  }
}

export function diskCacheSet(key, data, ttlMs) {
  const payload = JSON.stringify({ key, expiresAt: Date.now() + ttlMs, data });
  const size = Buffer.byteLength(payload);
  evictIfNeeded(size);
  try {
    fs.writeFileSync(filePath(key), payload);
  } catch {
    return;
  }
  const old = lru.get(key);
  if (old) totalBytes -= old.size;
  totalBytes += size;
  lru.set(key, { size, expiresAt: Date.now() + ttlMs });
}

export function diskCacheDelete(key) {
  const entry = lru.get(key);
  if (entry) {
    totalBytes -= entry.size;
    lru.delete(key);
  }
  try {
    fs.unlinkSync(filePath(key));
  } catch {
    // ignore
  }
}

export function diskCacheStats() {
  return {
    entries: lru.size,
    bytes: totalBytes,
    budgetBytes: BUDGET_BYTES,
    budgetMb: Math.round(BUDGET_BYTES / (1024 * 1024)),
    usedMb: Math.round(totalBytes / (1024 * 1024)),
  };
}

loadIndex();
