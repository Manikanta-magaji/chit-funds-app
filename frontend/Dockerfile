FROM node:20-alpine AS build

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY public/ ./public/
COPY src/ ./src/
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM nginx:alpine

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="Chit Fund Frontend"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
