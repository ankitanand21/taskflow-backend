FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

COPY prisma ./prisma

RUN npm install

COPY . .

RUN npx prisma generate && npm run build

CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && npm start"]