FROM oven/bun:1.3.10-alpine AS builder

WORKDIR /app

COPY package.json bun.lock turbo.json ./

COPY packages packages

COPY apps/server/package.json ./apps/server/

RUN bun install

COPY apps/server ./apps/server

RUN bun run build --filter=server

FROM oven/bun:1.3.10-alpine

WORKDIR /app

COPY --from=builder /app/apps/server/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "dist/index.mjs"]