FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

USER node

EXPOSE 5500

CMD ["npm", "start"]
