# Stage 1: Build bookvillage frontend
FROM node:20-alpine AS bv-builder
WORKDIR /app
ENV BROWSERSLIST_IGNORE_OLD_DATA=1
ENV NODE_OPTIONS=--max-old-space-size=512
COPY bookvillage/package.json bookvillage/package-lock.json ./
RUN npm ci
COPY bookvillage/ .
RUN npm run build

# Stage 2: Build admin frontend
FROM node:20-alpine AS admin-builder
WORKDIR /app
ENV BROWSERSLIST_IGNORE_OLD_DATA=1
ENV NODE_OPTIONS=--max-old-space-size=512
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

# Backup/test files (exposed intentionally)
RUN mkdir -p /usr/share/nginx/html/backup && \
    printf '# BookVillage Database Backup Config\nDB_HOST=localhost\nDB_PORT=3407\nDB_NAME=bookvillage_mock\nDB_USER=root\nDB_PASS=1234\nAWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n' > /usr/share/nginx/html/backup/db_config.bak && \
    printf '<?xml version="1.0"?>\n<configuration>\n  <database host="localhost" port="3407" name="bookvillage_mock" user="root" password="1234"/>\n  <admin username="admin" password="admin1234"/>\n  <jwt secret="bv-internal-2024-secret" expiration="315360000"/>\n</configuration>\n' > /usr/share/nginx/html/backup/config.xml.old && \
    printf '#!/bin/bash\nmysqldump -h localhost -P 3407 -u root -p1234 bookvillage_mock > backup.sql\n' > /usr/share/nginx/html/backup/backup.sh && \
    printf 'Spring Boot Admin\nDefault: admin / admin1234\nDB: root / 1234 @ localhost:3407\nJWT Secret: bv-internal-2024-secret\n' > /usr/share/nginx/html/backup/notes.txt

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
