# ---- Build stage: install deps + build frontend ----
FROM node:22.11.0-alpine3.20 AS build
WORKDIR /app

# Copy manifests first for layer caching
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

# Install all workspace deps (no dev scripts)
RUN npm ci

# Build the frontend
COPY packages/frontend packages/frontend
RUN npm run build -w packages/frontend

# ---- Runtime stage: slim alpine ----
FROM node:22.11.0-alpine3.20 AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy backend source + node_modules (prod deps only)
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
RUN npm ci --omit=dev --workspace=@signal/backend

COPY packages/backend/src packages/backend/src

# Copy built frontend from build stage
COPY --from=build /app/packages/frontend/dist packages/frontend/dist

# Non-root user for security. With cap_drop:ALL + no-new-privileges, su-exec
# can't drop privileges (setgroups needs CAP_SETGID), so run directly as the
# signal user instead.
# Generate a self-signed TLS cert so Express can serve HTTPS directly inside
# the container. This ensures Secure cookies work with reverse proxies that
# forward to the container over HTTPS.
RUN apk add --no-cache wget openssl \
  && addgroup -S signal && adduser -S signal -G signal \
  && mkdir -p /app/data /app/certs \
  && openssl req -x509 -newkey rsa:2048 -nodes \
       -keyout /app/certs/key.pem -out /app/certs/cert.pem \
       -days 3650 -subj '/CN=signal' \
  && chown -R signal:signal /app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER signal

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
