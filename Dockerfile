# Use an environment that supports Node.js, Python, and other tools
FROM ubuntu:22.04

# Install Node.js, Python, and necessary tools for game servers
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    openjdk-17-jre \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Web Panel port (8080) and TCP Proxy port (6080)
EXPOSE 8080 6080

# Start the panel
CMD ["npm", "start"]

