#!/bin/sh
set -eu

# Running as the non-root 'signal' user (see Dockerfile USER signal).
# The bind-mounted /app/data must be writable by this user. If it isn't,
# fail with a clear message instead of a cryptic error.
if [ ! -w /app/data ]; then
  echo "ERROR: /app/data is not writable by the signal user." >&2
  echo "Fix ownership on the host: chown -R <uid-of-signal> ./data" >&2
  exit 1
fi

# node:sqlite is experimental in Node 22.x and requires the flag (unflagged
# only in Node 23.4+). Local dev on Node 26 doesn't need it.
exec node --experimental-sqlite packages/backend/src/server.js
