FROM mcr.microsoft.com/playwright:v1.42.0-jammy

WORKDIR /autotest

# Install project dependencies inside the image (not on host)
COPY package*.json ./
RUN npm ci

# Keep running so `docker exec` can invoke tests on demand
CMD ["sleep", "infinity"]
