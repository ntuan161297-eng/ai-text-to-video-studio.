FROM node:20-bookworm-slim

# Install system dependencies: FFmpeg, Python3, and Chromium/Remotion dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    chromium \
    fonts-noto-color-emoji \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcups2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install edge-tts python package for Vietnamese voice generation
RUN pip3 install --no-cache-dir edge-tts --break-system-packages

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV HYPERFRAMES_SKIP_SKILLS=1
ENV TEMP_DIR=/tmp/video-jobs
ENV OUTPUT_DIR=/app/output

EXPOSE 4000

CMD ["npm", "run", "server"]
