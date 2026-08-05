FROM node:24.16.0-alpine AS base
RUN corepack enable && addgroup -S organizei && adduser -S organizei -G organizei
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/testkit/package.json packages/testkit/package.json
RUN pnpm install --frozen-lockfile --prod=false
FROM base AS build
COPY . .
RUN pnpm --filter @organizei/web build
FROM node:24.16.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S organizei && adduser -S organizei -G organizei
COPY --from=build --chown=organizei:organizei /app/apps/web/.next/standalone ./
COPY --from=build --chown=organizei:organizei /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=organizei:organizei /app/apps/web/public ./apps/web/public
USER organizei
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
