FROM node:14-slim

ARG WEBROOT=/tmp/chatgpt-chatbot

WORKDIR $WEBROOT

COPY node_modules $WEBROOT/node_modules
COPY index.* $WEBROOT/
COPY package.* $WEBROOT/

CMD npm run start