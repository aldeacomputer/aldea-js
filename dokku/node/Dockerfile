FROM node:18

RUN mkdir /app
WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build
RUN yarn workspace @aldea/vm compile

RUN yarn tsc

WORKDIR /app/vm

WORKDIR /app/node
CMD yarn start
