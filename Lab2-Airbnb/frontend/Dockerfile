FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time environment for Vite
ARG VITE_API_URL
ARG VITE_AI_SERVICE_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_AI_SERVICE_URL=${VITE_AI_SERVICE_URL}

RUN npm run build

FROM node:20-bullseye-slim AS runner

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
