FROM node

RUN mkdir config

COPY release ./
RUN npm i

EXPOSE 80
EXPOSE 443

CMD ["node", "server.js", "-c", "config/conf.json"]