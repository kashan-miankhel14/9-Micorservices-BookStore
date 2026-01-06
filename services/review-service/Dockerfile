FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --only=production
COPY . .
EXPOSE 3005
CMD ["node", "index.js"]
