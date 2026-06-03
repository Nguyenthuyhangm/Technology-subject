# Stage 1: Maven build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Stage 2: Build Node modules for crawlers
FROM node:22-bullseye-slim AS node_deps
WORKDIR /app
# Install native tools needed for npm packages that extract archives
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl tar unzip build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

# When building node modules, skip Puppeteer's Chromium download — we'll install system Chromium in runtime
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy only node-related files from backend to install puppeteer/playwright deps
COPY package.json package-lock.json* ./
# Run npm install with explicit env vars to skip browser downloads during install
RUN PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    npm ci --legacy-peer-deps --no-audit --progress=false || \
    PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --legacy-peer-deps --no-audit --progress=false

# Stage 3: Runtime image - base on Node so crawlers can spawn node, and install JRE to run Java jar
FROM node:22-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    ca-certificates curl gnupg tar unzip \
    chromium fonts-liberation \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxss1 libasound2 libx11-xcb1 libgbm1 libgtk-3-0 libx11-6 libxcomposite1 libxdamage1 libxrandr2 libpangocairo-1.0-0 libpango-1.0-0 libexpat1 libxcb1 libxrender1 libasound2-data \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Copy node modules and package.json from node_deps stage so Java can spawn node scripts
COPY --from=node_deps /app/node_modules ./node_modules
COPY --from=node_deps /app/package.json ./package.json

# Copy crawler scripts
COPY cocolux-price.js ./cocolux-price.js
COPY watsons-price.js ./watsons-price.js

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
