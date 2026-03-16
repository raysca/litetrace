FROM oven/bun:1-slim

WORKDIR /app

# Install production dependencies only
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY src/ ./src/
COPY config.yaml ./

EXPOSE 3000 4317 4318

CMD ["bun", "run", "src/index.ts"]
