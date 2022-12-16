FROM node:18

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .

COPY lib lib
COPY compiler compiler
COPY sdk-js sdk-js
COPY vm vm
COPY node node

RUN ls

RUN yarn install
RUN yarn build
RUN yarn workspace @aldea/vm build

WORKDIR /app/node
CMD yarn start
