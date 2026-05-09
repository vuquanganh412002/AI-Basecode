FROM node:20-alpine
# JST 運用 — Alpine has no zoneinfo by default; install tzdata so the
# TZ=Asia/Tokyo env var actually shifts `new Date()` / log timestamps.
# See .claude/rules/nestjs.md §Timestamp policy.
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
