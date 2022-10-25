FROM node:18

RUN mkdir /app
WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build

WORKDIR /app/compiler-old
RUN yarn tsc

WORKDIR /app/vm

WORKDIR /app/node
CMD yarn start
