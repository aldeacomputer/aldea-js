FROM node:18

RUN mkdir /app
WORKDIR /app
COPY . .
WORKDIR /app/compiler
RUN yarn install
RUN yarn tsc
WORKDIR /app/vm
RUN yarn install
RUN node cmd/compile-all.js
WORKDIR /app/node
RUN yarn install
CMD yarn start

