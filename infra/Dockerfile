# Stage 1: Install dependencies via JFrog
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache curl && \
    curl -fL https://install-cli.jfrog.io | sh

ARG JF_URL
ARG JF_NPM_REPOSITORY

COPY package.json package-lock.json* ./

RUN --mount=type=secret,id=jfrog_config,target=/root/.jfrog/jfrog-cli.conf.v6 \
    if [ -f /root/.jfrog/jfrog-cli.conf.v6 ] && [ -n "$JF_NPM_REPOSITORY" ]; then \
        jf npmc --global=true --repo-resolve="$JF_NPM_REPOSITORY" && \
        jf npm install --omit=dev; \
    else \
        npm install --omit=dev; \
    fi

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
