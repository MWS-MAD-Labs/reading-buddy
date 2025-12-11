# Reading Buddy - Production Dockerfile with EPUB Support
FROM node:20-slim AS base

# Install dependencies for native modules (canvas, pdf2pic) and Calibre
RUN apt-get update && apt-get install -y \
    # Native module dependencies
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    # Calibre for EPUB conversion
    calibre \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# 1. Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package.json first
COPY package*.json ./
# Copy web package.json
COPY web/package*.json ./web/

# Install dependencies
WORKDIR /app/web
RUN npm ci

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web

# Copy root files
COPY package*.json ./

WORKDIR /app/web

# Build arguments for Next.js public env vars
# Provide placeholder defaults to allow build to succeed
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ARG NEXT_PUBLIC_RAG_API_URL=http://172.16.0.65:8000
ARG MINIO_ENDPOINT=placeholder.minio.com
ARG MINIO_PORT=443
ARG MINIO_USE_SSL=true

# Set environment variables for build
# Next.js collects anonymous telemetry data - disable it
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_RAG_API_URL=$NEXT_PUBLIC_RAG_API_URL
ENV MINIO_ENDPOINT=$MINIO_ENDPOINT
ENV MINIO_PORT=$MINIO_PORT
ENV MINIO_USE_SSL=$MINIO_USE_SSL

# Build the application
RUN npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./

# Copy the static folder to the correct location
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./.next/static

# Copy the public folder
COPY --from=builder /app/web/public ./public

# Set the correct permission for prerender cache
RUN chown nextjs:nodejs ./.next

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
