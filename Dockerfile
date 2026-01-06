# Use the official Node.js image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Create necessary directories
RUN mkdir -p .next public

# Copy built assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy next.config.js if it exists
RUN if [ -f /app/next.config.js ]; then \
      cp /app/next.config.js ./; \
    fi

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]