FROM node:19-alpine as build

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .


RUN mkdir lib lib/assemblyscript compiler node sdk-js vm

COPY compiler/package.json compiler
COPY lib/assemblyscript/package.json lib/assemblyscript
COPY node/package.json node
COPY sdk-js/package.json sdk-js
COPY vm/package.json vm

RUN yarn install

COPY compiler compiler
COPY lib lib
COPY node node
COPY sdk-js sdk-js
COPY vm vm

RUN yarn build


FROM node:19-alpine

RUN mkdir /app
WORKDIR /app

COPY package.json .
COPY .yarnrc.yml .
COPY .yarn .yarn
COPY yarn.lock .

COPY --from=build /app/compiler compiler
COPY --from=build /app/lib lib
COPY --from=build /app/node node
COPY --from=build /app/sdk-js sdk-js
COPY --from=build /app/vm vm

RUN yarn workspaces focus --production

WORKDIR /app/node
RUN yarn workspaces focus --production
CMD yarn start