FROM node:22-alpine
# JST 運用 — Alpine has no zoneinfo by default; install tzdata so the
# TZ=Asia/Tokyo env var actually shifts `new Date()` / log timestamps.
# See .claude/rules/nestjs.md §Timestamp policy.
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Pre-build dist/main.js into the image so it always exists before
# `nest start --watch` spawns `node dist/main`. Without this, on the very
# first `docker compose up` the watcher races tsc's first emit and crashes
# with "Cannot find module '/app/dist/main'" (the file isn't flushed to the
# WSL2 bind-mount yet). Combined with `deleteOutDir: false` in nest-cli.json,
# the watcher recompiles in place without ever removing the entrypoint.
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
