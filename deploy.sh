#!/bin/bash

# Default remote server IP
REMOTE_SERVER="45.32.31.135"
REMOTE_USER="lin"
REMOTE_PATH="~/KairosTrader"

# Build the project locally
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deployment."
    exit 1
fi

echo "✅ Build successful!"

# Sync to remote server
echo "🚀 Deploying to ${REMOTE_USER}@${REMOTE_SERVER}:${REMOTE_PATH}..."

# Create directories if they don't exist
ssh ${REMOTE_USER}@${REMOTE_SERVER} "mkdir -p ${REMOTE_PATH}/{dist,public,node_modules}"

# Sync dist folder (compiled JavaScript)
echo "📦 Syncing dist folder..."
rsync -avz --delete ./dist/ ${REMOTE_USER}@${REMOTE_SERVER}:${REMOTE_PATH}/dist/

# Sync public folder
echo "📦 Syncing public folder..."
rsync -avz --delete ./public/ ${REMOTE_USER}@${REMOTE_SERVER}:${REMOTE_PATH}/public/

# Sync package files
echo "📦 Syncing package files..."
rsync -avz ./package.json ./package-lock.json ${REMOTE_USER}@${REMOTE_SERVER}:${REMOTE_PATH}/

# Sync deployment files
echo "📦 Syncing deployment files..."
rsync -avz ./deploy/ ${REMOTE_USER}@${REMOTE_SERVER}:${REMOTE_PATH}/deploy/

echo "✨ Deployment complete!"
