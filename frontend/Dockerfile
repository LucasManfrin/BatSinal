# Contexto de build: raiz do repositório (workspace npm e package-lock.json ficam lá).
FROM node:22-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
# Sem scripts: o postinstall do MSW regravaria o worker versionado e o esbuild não precisa do seu.
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY frontend frontend

# Variáveis VITE_ são fixadas no bundle durante o build.
ARG VITE_USE_MOCK=false
ARG VITE_API_URL=/api
ARG VITE_SHOW_SIMULATOR=true
ARG VITE_DEFAULT_CAMPUS_SLUG=unisagrado
ENV VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_API_URL=$VITE_API_URL \
    VITE_SHOW_SIMULATOR=$VITE_SHOW_SIMULATOR \
    VITE_DEFAULT_CAMPUS_SLUG=$VITE_DEFAULT_CAMPUS_SLUG
RUN npm run build

FROM nginx:stable-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
