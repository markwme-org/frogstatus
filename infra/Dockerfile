# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install JFrog CLI
RUN apk add --no-cache curl && \
    curl -fL https://install-cli.jfrog.io | sh

# Accept JFrog server URL and npm repository as build args
ARG JF_URL
ARG JF_NPM_REPOSITORY

# Copy package files
COPY package.json package-lock.json* ./
COPY app-api/package.json ./app-api/
COPY app-ui/package.json ./app-ui/

# Configure JFrog CLI for npm with authentication from BuildKit secret
RUN --mount=type=secret,id=jfrog_config,target=/root/.jfrog/jfrog-cli.conf.v6 \
    if [ -f /root/.jfrog/jfrog-cli.conf.v6 ] && [ -n "$JF_NPM_REPOSITORY" ]; then \
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

# Accept JFrog server URL and npm repository as build args
ARG JF_URL
ARG JF_NPM_REPOSITORY

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
COPY app-api/package.json ./app-api/
COPY app-ui/package.json ./app-ui/

# Configure JFrog CLI for npm and install production dependencies
# Note: jf npm doesn't support --workspace flag, so we install all production deps
RUN --mount=type=secret,id=jfrog_config,target=/root/.jfrog/jfrog-cli.conf.v6 \
    if [ -f /root/.jfrog/jfrog-cli.conf.v6 ] && [ -n "$JF_NPM_REPOSITORY" ]; then \
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
