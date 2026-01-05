# Alpine-based Node image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start backend
CMD ["npm", "start"]

