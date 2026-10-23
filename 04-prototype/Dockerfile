FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/catalog/package.json packages/catalog/
COPY packages/mocks/package.json packages/mocks/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
COPY packages/evals/package.json packages/evals/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787 LOG_DIR=/app/logs
COPY --from=build /app /app
RUN mkdir -p /app/logs && chown node:node /app/logs
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "packages/server/src/main.ts"]
