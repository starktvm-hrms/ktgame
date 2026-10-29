# Kerala Explorer server (serves the game client too). Build from repo root:
#   docker build -f server/Dockerfile -t kerala-explorer .
FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json* server/
RUN cd server && npm install --omit=dev --no-audit --no-fund
COPY index.html ./
COPY css css
COPY js js
COPY lib lib
COPY assets assets
COPY server/src server/src
COPY server/sql server/sql
ENV NODE_ENV=production PORT=8080 STATIC_DIR=/app
EXPOSE 8080
USER node
CMD ["node", "server/src/index.js"]
