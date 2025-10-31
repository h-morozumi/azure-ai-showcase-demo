# syntax=docker/dockerfile:1.7-labs
FROM node:20-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --frozen-lockfile --filter @azure-ai-showcase/frontend...

COPY apps/frontend/tsconfig.json apps/frontend/tsconfig.json
COPY apps/frontend/tsconfig.app.json apps/frontend/tsconfig.app.json
COPY apps/frontend/tsconfig.node.json apps/frontend/tsconfig.node.json
COPY apps/frontend/vite.config.ts apps/frontend/vite.config.ts
COPY apps/frontend/postcss.config.cjs apps/frontend/postcss.config.cjs
COPY apps/frontend/tailwind.config.ts apps/frontend/tailwind.config.ts
COPY apps/frontend/index.html apps/frontend/index.html
COPY apps/frontend/src apps/frontend/src
COPY apps/frontend/public apps/frontend/public

WORKDIR /workspace/apps/frontend

RUN pnpm build

FROM nginx:1.27-alpine AS runner

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
