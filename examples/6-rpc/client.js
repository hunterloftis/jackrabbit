'use strict';

const Jackrabbit = require('../..');

const rabbit = Jackrabbit(process.env.RABBIT_URL);
const exchange = rabbit.default();
const rpc = exchange.queue({ name: 'rpc_queue', prefetch: 1, durable: false });

const onReply = (data) => {

    console.log('result:', data.result);
    rabbit.close();
};

rpc.on('ready', () => {

    exchange.publish({ n: 40 }, {
        key: 'rpc_queue',
        reply: onReply    // auto sends necessary info so the reply can come to the exclusive reply-to queue for this rabbit instance
    });
});
