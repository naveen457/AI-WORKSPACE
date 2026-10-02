FROM node:24-slim

# Explicit image version tag.
# GitHub Actions reads this version and automatically publishes this tag alongside :latest.
# No git commit hash tags are generated. You can change this to "1.3.0", "1.3.1", "latest", etc.
ARG VERSION=1.3.0
LABEL version="1.3.0"

WORKDIR /Astrix/backend

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "start"]