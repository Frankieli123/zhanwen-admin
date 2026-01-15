# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG NODE_ENV=production
ARG VITE_API_URL=/api
ARG VITE_BASE_URL=/

ENV NODE_ENV=$NODE_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_URL=$VITE_BASE_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY scripts ./scripts
COPY src ./src

RUN corepack enable && corepack prepare pnpm@10.11.1 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
