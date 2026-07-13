FROM node:24-alpine

WORKDIR /Astrix/backend

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "start"]