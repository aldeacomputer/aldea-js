FROM node:19-alpine as build

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .


RUN mkdir lib lib/assemblyscript packages packages/compiler packages/mocknet packages/sdk-js packages/src

COPY packages/compiler/package.json packages/compiler
COPY lib/assemblyscript/package.json lib/assemblyscript
COPY packages/mocknet/package.json packages/mocknet
COPY packages/sdk-js/package.json packages/sdk-js
COPY packages/vm/package.json packages/vm

RUN yarn install

COPY packages/compiler packages/compiler
COPY lib lib
COPY packages/mocknet packages/mocknet
COPY packages/sdk-js packages/sdk-js
COPY packages/vm packages/vm

RUN yarn build


FROM node:19-alpine

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .

COPY --from=build /app/packages /app/packages
COPY --from=build /app/lib lib

WORKDIR /app/packages/mocknet
RUN yarn workspaces focus --production
RUN chmod +x startup.sh
ENTRYPOINT [ "./startup.sh" ]
