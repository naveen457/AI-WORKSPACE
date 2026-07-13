FROM node:24-alpine AS builder

WORKDIR /Astrix/frontend

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine

WORKDIR /Astrix/frontend
ENV NODE_ENV=production

RUN npm install -g serve@14.1.2

COPY --from=builder /Astrix/frontend/dist ./dist

EXPOSE 5173

CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"]
