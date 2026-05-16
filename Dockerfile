FROM node:22-alpine AS base
WORKDIR /app

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/server/package.json packages/server/tsconfig.json packages/server/
COPY packages/cli/package.json packages/cli/tsconfig.json packages/cli/
COPY packages/sdk/package.json packages/sdk/tsconfig.json packages/sdk/
COPY packages/registry/package.json packages/registry/tsconfig.json packages/registry/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM base AS runtime
WORKDIR /app
RUN apk add --no-cache wget && npm install -g pnpm
COPY --from=build /app/packages/core/dist /app/packages/core/dist
COPY --from=build /app/packages/server/dist /app/packages/server/dist
COPY --from=build /app/packages/cli/dist /app/packages/cli/dist
COPY --from=build /app/packages/sdk/dist /app/packages/sdk/dist
COPY --from=build /app/packages/registry/dist /app/packages/registry/dist
COPY --from=build /app/packages/core/package.json /app/packages/core/package.json
COPY --from=build /app/packages/server/package.json /app/packages/server/package.json
COPY --from=build /app/packages/cli/package.json /app/packages/cli/package.json
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/examples/nexarion.config.json /app/nexarion.config.json

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "/app/packages/server/dist/cli.js", "--transport", "http", "--port", "3000"]
