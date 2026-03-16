FROM oven/bun:1.3.10-alpine AS builder

WORKDIR /app

COPY package.json bun.lock turbo.json ./

COPY packages packages

COPY apps/web/package.json ./apps/web/

RUN bun install

COPY apps/web ./apps/web

RUN bun run build --filter=web

FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]