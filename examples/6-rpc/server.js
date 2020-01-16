'use strict';

const Jackrabbit = require('../..');

const rabbit = Jackrabbit(process.env.RABBIT_URL);
const exchange = rabbit.default();
const rpc = exchange.queue({ name: 'rpc_queue', prefetch: 1, durable: false });

const fib = (n) => {

    if (n === 0) {
        return 0;
    }

    if (n === 1) {
        return 1;
    }

    return fib(n - 1) + fib(n - 2);
};

const onRequest = (data, reply) => {

    console.log('got request for n:', data.n);
    reply({ result: fib(data.n) });
};

rpc.consume(onRequest);
