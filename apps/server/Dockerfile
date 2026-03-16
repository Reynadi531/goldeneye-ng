FROM oven/bun:1.3.10-alpine

WORKDIR /app

COPY package.json bun.lock turbo.json ./

COPY packages packages

COPY apps/server/package.json ./apps/server/

RUN bun install

COPY apps/server ./apps/server

EXPOSE 3000

CMD ["bun", "run", "apps/server/src/index.ts"]