FROM node:18

RUN yarn set version berry
RUN mkdir /app
WORKDIR /app
COPY package.json .
COPY .yarn .
COPY yarn.lock .

COPY demos-webapp/package.json demos-webapp/package.json
RUN yarn workspace @aldea/demos-website install
COPY demos-webapp demos-webapp
ENV NEXT_PUBLIC_NODE_URL="https://api.demos.aldea.computer"
RUN yarn workspace @aldea/demos-website build

CMD ["yarn", "workspace", "@aldea/demos-website", "start"]

