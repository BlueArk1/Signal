# ---- Build stage: install deps + build frontend ----
FROM node:22-alpine AS build
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
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy backend source + node_modules (prod deps only)
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
RUN npm ci --omit=dev --workspace=@signal/backend

COPY packages/backend/src packages/backend/src

# Copy built frontend from build stage
COPY --from=build /app/packages/frontend/dist packages/frontend/dist

# Non-root user for security
RUN addgroup -S signal && adduser -S signal -G signal \
  && mkdir -p /app/data && chown -R signal:signal /app
USER signal

EXPOSE 3000

CMD ["node", "packages/backend/src/server.js"]
