FROM node:24.22.1-alpine AS dependencies

WORKDIR /app

# bcrypt can require a native build when a prebuilt binary is unavailable.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24.22.1-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

USER node

EXPOSE 3000

CMD ["node", "src/backend/index.js"]
