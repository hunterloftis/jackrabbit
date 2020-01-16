'use strict';

const Jackrabbit = require('../..');

const rabbit = Jackrabbit(process.env.RABBIT_URL);
const exchange = rabbit.default();

// ensure queue is ready before sending out request
const rpc = exchange.queue({ name: 'rpc_queue', prefetch: 1, durable: false, autoDelete: true });
rpc.on('ready', () => {

    exchange.rpcClient('rpc_queue', { n: 40 }, null, console.log);
});
