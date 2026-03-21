# Use Playwright's official image — has Chromium + all system deps pre-installed
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Copy package files and install deps
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code (respects .dockerignore)
COPY . .

# Build Next.js
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs && chmod 777 /app/logs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
ENV LOG_DIR=/app/logs

EXPOSE 4000

# Use next start with full node_modules (Playwright needs them)
CMD ["npx", "next", "start", "-p", "4000"]
