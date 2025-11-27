FROM node:20-bullseye-slim AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .
RUN mkdir -p uploads

ENV NODE_ENV=production \
    PORT=5001

EXPOSE 5001

CMD ["npm", "run", "start"]
