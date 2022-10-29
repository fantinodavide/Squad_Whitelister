FROM node

COPY release ./
RUN npm i

RUN touch conf.json

EXPOSE 80

CMD ["node", "server.js"]