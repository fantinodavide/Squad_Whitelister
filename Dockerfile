FROM node

COPY release ./
RUN npm i

EXPOSE 80

CMD ["node", "server.js"]