FROM node:18

RUN yarn set version berry

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarn .
COPY yarn.lock .
COPY demos-webapp demos-webapp

RUN yarn workspace @aldea/demos-webapp install
RUN yarn workspace @aldea/demos-webapp build

ENV NEXT_PUBLIC_NODE_URL="https://api.demos.aldea.computer"

CMD ["yarn", "workspace", "@aldea/demos-webapp", "start"]

