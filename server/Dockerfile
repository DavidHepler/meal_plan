FROM node:18-alpine

WORKDIR /app

COPY server/package.json ./
RUN npm install --production

COPY server/server.js ./

# Create directories for database and uploads
RUN mkdir -p /app/database /app/uploads

# Copy database schema and seed files from parent context
COPY database/ ./database/

EXPOSE 3000

CMD ["node", "server.js"]
