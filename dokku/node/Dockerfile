FROM node:18

RUN mkdir /app
WORKDIR /app

COPY . .

RUN yarn install
RUN yarn build
RUN yarn workspace @aldea/vm build

WORKDIR /app/node
CMD yarn start
