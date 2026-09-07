FROM node:22.23.2-bookworm-slim

WORKDIR /app

# Keep build tooling available in the final image. This avoids Railway production
# install flags dropping Vite/TypeScript/tsx before the app is built or started.
ENV NODE_ENV=development
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --include=dev --no-audit --no-fund

COPY . .

RUN echo "[ysello] Docker build release 2026-09-07.3" \
    && npm run build:railway

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"]
