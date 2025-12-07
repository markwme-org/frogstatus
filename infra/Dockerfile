# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY app-api/package.json ./app-api/
COPY app-ui/package.json ./app-ui/

# Install dependencies
RUN npm install

# Copy source code
COPY app-api ./app-api
COPY app-ui ./app-ui

# Build both workspaces
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
COPY app-api/package.json ./app-api/

# Install only API production dependencies
RUN npm install --workspace=app-api --omit=dev

# Copy built artifacts and server
COPY --from=builder /app/app-api/dist ./app-api/dist
COPY --from=builder /app/app-ui/dist ./app-ui/dist
COPY infra/server.js ./

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "server.js"]
