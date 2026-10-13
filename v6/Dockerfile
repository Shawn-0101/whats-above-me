# small node image, just enough to run the server
FROM node:22-alpine

WORKDIR /app

# install deps first so docker can cache this layer
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
