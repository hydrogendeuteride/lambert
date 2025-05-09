FROM node:20-alpine

COPY package*.json ./
RUN npm install

COPY . .

RUN npm install dotenv

EXPOSE 3000

CMD ["node", "src/backend/index.js"]
