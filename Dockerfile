FROM node

COPY release ./
RUN npm i

RUN echo '{}' > conf.json

EXPOSE 80

CMD ["node", "server.js"]