#!/bin/sh
set -e

# Ensure the (possibly bind-mounted) data dir is writable by the app user,
# then drop privileges from root to the signal user.
chown -R signal:signal /app/data

exec su-exec signal node packages/backend/src/server.js
