FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./

# Copy database schema and seed files
COPY ../database/schema.sql ./database/
COPY ../database/seed.sql ./database/

# Create directories for database and uploads
RUN mkdir -p /app/database /app/uploads

EXPOSE 3000

CMD ["node", "server.js"]
