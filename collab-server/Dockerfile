FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1234
ENV YDOCS_DIR=/data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js cognito.js room-tokens.js ./

RUN mkdir -p /data && chown -R node:node /app /data

USER node

EXPOSE 1234

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e 'fetch("http://127.0.0.1:" + (process.env.PORT || 1234) + "/readyz").then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))'

CMD ["node", "server.js"]
