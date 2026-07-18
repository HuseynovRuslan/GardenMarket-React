# syntax=docker/dockerfile:1

# ---- Build stage ----
# This repo is locked with npm (package-lock.json), not bun — build with node.
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies (cached unless lockfile/package.json change)
COPY package.json package-lock.json ./
RUN npm ci

# API origin, baked into the bundle at build time. Declared as an ARG so
# `--build-arg VITE_API_BASE=...` (or Coolify's build-time env) actually reaches
# `npm run build`; without this line the value in src/api.js is what ships.
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}

# Build the app
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

# SPA config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets produced by the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
