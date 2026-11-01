FROM node:22-bookworm-slim AS builder
WORKDIR /srv/app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY src/ ./src/
COPY public/widget.html ./public/widget.html
RUN npm run build

FROM node:22-bookworm-slim
ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=${SOURCE_COMMIT}
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates tzdata && rm -rf /var/lib/apt/lists/*
WORKDIR /srv/app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src/ ./src/
COPY python/ ./python/
COPY --from=builder /srv/app/public/dist/ ./public/dist/
RUN groupadd --system app && useradd --system --gid app app && chown -R app:app /srv/app
USER app
ENV PORT=8787 PYTHON_BIN=python3 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e 'fetch("http://127.0.0.1:8787/health").then(x=>process.exit(x.ok?0:1)).catch(()=>process.exit(1))'
CMD ["node","src/server.js"]
