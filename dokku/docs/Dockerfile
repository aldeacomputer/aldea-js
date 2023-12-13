FROM node:18-alpine AS build

WORKDIR /build

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .

RUN mkdir -p docs packages/compiler packages/core packages/sdk packages/wasm-metering

COPY docs/package.json docs
COPY packages/compiler/package.json packages/compiler
COPY packages/core/package.json packages/core
COPY packages/sdk/package.json packages/sdk
COPY packages/wasm-metering/package.json packages/wasm-metering

RUN yarn install

COPY docs docs
COPY packages/compiler packages/compiler
COPY packages/core packages/core
COPY packages/sdk packages/sdk
COPY packages/wasm-metering packages/wasm-metering

RUN yarn build
WORKDIR /build/docs
RUN yarn docs
RUN yarn build

### SERVE

FROM pierrezemb/gostatic as server
COPY --from=build /build/docs/.vitepress/dist /srv/http/
COPY docs/headers.json /config/headerConfig.json
ENTRYPOINT ["/goStatic"]
