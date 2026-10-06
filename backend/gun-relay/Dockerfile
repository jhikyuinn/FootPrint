FROM node:lts-alpine
WORKDIR /work
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
EXPOSE 8765
CMD ["npm", "start"]
