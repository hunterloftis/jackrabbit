FROM node

ADD package.json /tmp/package.json
RUN npm install --prefix /tmp
ADD . /jackrabbit
RUN cp -r /tmp/node_modules /jackrabbit
WORKDIR /jackrabbit

CMD bash
