FROM node:19-alpine as build

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .


RUN mkdir packages packages/compiler packages/mocknet packages/sdk packages/core packages/vm packages/wasm-metering

COPY packages/compiler/package.json packages/compiler
COPY packages/mocknet/package.json packages/mocknet
COPY packages/sdk/package.json packages/sdk
COPY packages/core/package.json packages/core
COPY packages/vm/package.json packages/vm
COPY packages/wasm-metering/package.json packages/wasm-metering

RUN yarn install

COPY packages/compiler packages/compiler
COPY packages/mocknet packages/mocknet
COPY packages/sdk packages/sdk
COPY packages/core packages/core
COPY packages/vm packages/vm
COPY packages/wasm-metering packages/wasm-metering

RUN yarn build


FROM node:19-alpine

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .

COPY --from=build /app/packages /app/packages

WORKDIR /app/packages/mocknet
RUN yarn workspaces focus --production
RUN chmod +x startup.sh
ENTRYPOINT [ "./startup.sh" ]
