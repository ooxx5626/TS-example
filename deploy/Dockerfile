FROM node:20-alpine

WORKDIR /app

# Create app directory
RUN mkdir -p /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built JavaScript files
COPY dist/ ./dist/

# Copy public folder for frontend
COPY public/ ./public/

# Copy .env file if it exists
COPY .env* ./

# Environment variables
ENV NODE_ENV=production
ENV SERVER_PORT=3001

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["node", "dist/index.js"]
