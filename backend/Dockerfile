FROM node:20-alpine

# Install Docker CLI and Docker Compose plugin so the backend can manage containers
RUN apk add --no-cache docker-cli docker-cli-compose curl

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD ["npm", "start"]