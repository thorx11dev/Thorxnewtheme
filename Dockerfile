# Use official Node.js LTS image
FROM node:20-slim AS builder

# Install build essentials for native modules (bcrypt, pg, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install ALL dependencies (including dev for building)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build both frontend and backend
RUN npm run build

# --- Production Image ---
FROM node:20-slim

WORKDIR /app

# Install production dependencies ONLY
COPY package*.json ./
COPY .npmrc ./
RUN apt-get update && apt-get install -y python3 make g++ \
    && npm install --omit=dev --legacy-peer-deps \
    && apt-get purge -y python3 make g++ && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Start the server
CMD ["node", "dist/index.js"]
