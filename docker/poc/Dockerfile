# syntax=docker/dockerfile:1.7

FROM nginx:1.30.4-alpine AS web

RUN rm -rf /usr/share/nginx/html/* \
    && mkdir -p /usr/share/nginx/html/customer \
                /usr/share/nginx/html/staff \
                /usr/share/nginx/html/__reset

COPY docker/poc/nginx.conf /etc/nginx/conf.d/default.conf
COPY POC/build/carchief_website.html /usr/share/nginx/html/index.html
COPY POC/build/carchief_customer_backend.html /usr/share/nginx/html/customer/index.html
COPY POC/build/carchief_staff_backend.html /usr/share/nginx/html/staff/index.html
COPY POC/public/favicon.svg /usr/share/nginx/html/favicon.svg
COPY POC/public/manifest.webmanifest /usr/share/nginx/html/manifest.webmanifest
COPY POC/public/sw.js /usr/share/nginx/html/sw.js
COPY docker/poc/reset.html /usr/share/nginx/html/__reset/index.html

EXPOSE 8080


FROM node:22.23.1-alpine3.24 AS ai-build

WORKDIR /app

COPY POC/package.json POC/package-lock.json ./
# The supplied lockfile is missing entries required by package.json. Reconcile
# only the image-layer copy, then perform the clean install; POC files stay unchanged.
RUN npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
    && npm ci --ignore-scripts --no-audit --no-fund

COPY POC/server.ts ./server.ts
RUN ./node_modules/.bin/esbuild server.ts \
      --bundle \
      --platform=node \
      --format=cjs \
      --packages=external \
      --sourcemap \
      --outfile=dist/server.cjs \
    && npm prune --omit=dev \
    && npm audit fix --omit=dev --ignore-scripts --no-fund


FROM node:22.23.1-alpine3.24 AS ai

ENV NODE_ENV=production
WORKDIR /app

COPY --from=ai-build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=ai-build --chown=node:node /app/node_modules ./node_modules
COPY --from=ai-build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
