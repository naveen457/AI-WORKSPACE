FROM node:24-slim AS builder

# Explicit image version tag.
# GitHub Actions reads this version and automatically publishes this tag alongside :latest.
# No git commit hash tags are generated. You can change this to "1.3.0", "1.3.1", "latest", etc.
ARG VERSION=1.3.0
LABEL version="1.3.0"

WORKDIR /Astrix/frontend

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-slim

ARG VERSION=1.3.0
LABEL version="1.3.0"

WORKDIR /Astrix/frontend
ENV NODE_ENV=production

RUN npm install -g serve@14.1.2

COPY --from=builder /Astrix/frontend/dist ./dist

EXPOSE 5173

CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
