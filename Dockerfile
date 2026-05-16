FROM node:22-alpine AS base
WORKDIR /app

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/server/package.json packages/server/tsconfig.json packages/server/
COPY packages/cli/package.json packages/cli/tsconfig.json packages/cli/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM base AS runtime
WORKDIR /app
RUN npm install -g pnpm
COPY --from=build /app/packages/core/dist /app/packages/core/dist
COPY --from=build /app/packages/server/dist /app/packages/server/dist
COPY --from=build /app/packages/cli/dist /app/packages/cli/dist
COPY --from=build /app/packages/core/package.json /app/packages/core/package.json
COPY --from=build /app/packages/server/package.json /app/packages/server/package.json
COPY --from=build /app/packages/cli/package.json /app/packages/cli/package.json
COPY --from=build /app/package.json /app/package.json

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "/app/packages/server/dist/cli.js"]
