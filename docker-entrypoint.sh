#!/bin/sh
set -eu

# Ensure the (possibly bind-mounted) data dir is writable by the app user.
# Only chown when ownership is wrong — avoids a slow recursive chown on every
# restart (especially with a large data dir).
if [ "$(stat -c %u /app/data)" != "$(id -u signal)" ]; then
  chown -R signal:signal /app/data
fi

exec su-exec signal node packages/backend/src/server.js
