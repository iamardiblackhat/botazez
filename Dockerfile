FROM node:22-slim

WORKDIR /app

# Install dependencies first for optimal layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0

CMD ["sh", "-c", "npx vite --host 0.0.0.0 --port ${PORT:-8000}"]
