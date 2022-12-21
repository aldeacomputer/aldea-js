FROM node:18-alpine as build

RUN yarn set version berry

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .

COPY lib lib
COPY compiler compiler
COPY sdk-js sdk-js

RUN yarn install
RUN yarn workspace @aldea/sdk-js docs

FROM nginx:alpine

# Copy fully compiled files.
COPY --from=build /app/sdk-js/docs /usr/share/nginx/html
