# ---------- Stage 1: Build the client ----------
FROM node:20-alpine AS client-build

WORKDIR /app/client

# Install dependencies and build React app
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build


# ---------- Stage 2: Build and run the server ----------
FROM node:20-alpine AS server

WORKDIR /app

# Copy and install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev && npm cache clean --force

# Copy server source
COPY server ./server

# Copy built client into server's public folder
COPY --from=client-build /app/client/dist ./server/public

# Environment and port
ENV PORT=5000

EXPOSE 5000

# Start the backend
CMD ["npm", "start", "--prefix", "server"]
