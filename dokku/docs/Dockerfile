FROM node:16-alpine

RUN mkdir /app

COPY docs /app

WORKDIR /app

RUN yarn
RUN yarn build

CMD ["yarn", "start"]
