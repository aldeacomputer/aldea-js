FROM node:18

RUN mkdir /app
WORKDIR /app
COPY . .
RUN yarn install
WORKDIR /app/compiler
RUN yarn tsc
WORKDIR /app/vm
RUN yarn build
WORKDIR /app/node
CMD yarn start
