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

exec node packages/backend/src/server.js
