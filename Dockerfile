# Stage 1: Build bookvillage frontend
FROM node:20-alpine AS bv-builder
WORKDIR /app
ENV BROWSERSLIST_IGNORE_OLD_DATA=1
ENV NODE_OPTIONS=--max-old-space-size=1024
COPY bookvillage/package.json bookvillage/package-lock.json ./
RUN npm ci
COPY bookvillage/ .
RUN npm run build

# Stage 2: Build admin frontend
FROM node:20-alpine AS admin-builder
WORKDIR /app
ENV BROWSERSLIST_IGNORE_OLD_DATA=1
ENV NODE_OPTIONS=--max-old-space-size=1024
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ .
RUN npm run build

# Stage 3: nginx serving both apps
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Bookvillage app at root
COPY --from=bv-builder /app/dist /usr/share/nginx/html

# Admin app at /admin/ (built with base=/admin/)
COPY --from=admin-builder /app/dist /usr/share/nginx/html/admin

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
