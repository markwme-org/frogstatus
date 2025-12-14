# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install JFrog CLI
RUN apk add --no-cache curl && \
    curl -fL https://install-cli.jfrog.io | sh

# Accept JFrog server URL, npm repository, and access token as build args
ARG JF_URL
ARG JF_NPM_REPOSITORY
ARG JF_ACCESS_TOKEN

# Copy package files
COPY package.json package-lock.json* ./
COPY app-api/package.json ./app-api/
COPY app-ui/package.json ./app-ui/

# Configure JFrog CLI for npm with authentication
RUN if [ -n "$JF_URL" ] && [ -n "$JF_NPM_REPOSITORY" ] && [ -n "$JF_ACCESS_TOKEN" ]; then \
        jf config add jfrog-server --url="$JF_URL" --access-token="$JF_ACCESS_TOKEN" --interactive=false && \
        jf npmc --global=true --repo-resolve="$JF_NPM_REPOSITORY" && \
        jf npm install; \
    else \
        echo "registry=https://registry.npmjs.org/" > .npmrc && \
        npm install; \
    fi

# Copy source code
COPY app-api ./app-api
COPY app-ui ./app-ui

# Build both workspaces
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install JFrog CLI
RUN apk add --no-cache curl && \
    curl -fL https://install-cli.jfrog.io | sh

# Accept JFrog server URL, npm repository, and access token as build args
ARG JF_URL
ARG JF_NPM_REPOSITORY
ARG JF_ACCESS_TOKEN

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
COPY app-api/package.json ./app-api/
COPY app-ui/package.json ./app-ui/

# Configure JFrog CLI for npm and install production dependencies
# Note: jf npm doesn't support --workspace flag, so we install all production deps
RUN if [ -n "$JF_URL" ] && [ -n "$JF_NPM_REPOSITORY" ] && [ -n "$JF_ACCESS_TOKEN" ]; then \
        jf config add jfrog-server --url="$JF_URL" --access-token="$JF_ACCESS_TOKEN" --interactive=false && \
        jf npmc --global=true --repo-resolve="$JF_NPM_REPOSITORY" && \
        jf npm install --omit=dev; \
    else \
        echo "registry=https://registry.npmjs.org/" > .npmrc && \
        npm install --omit=dev; \
    fi

# Copy built artifacts and server
COPY --from=builder /app/app-api/dist ./app-api/dist
COPY --from=builder /app/app-ui/dist ./app-ui/dist
COPY infra/server.js ./

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "server.js"]
