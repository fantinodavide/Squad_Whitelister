FROM node

COPY package.json ./package.json
RUN npm i

RUN npm run build

COPY release ./

RUN echo '{}' > conf.json

EXPOSE 80

CMD ["node", "server.js"]