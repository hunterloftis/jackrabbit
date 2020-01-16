'use strict';

const Jackrabbit = require('../..');

const rabbit = Jackrabbit(process.env.RABBIT_URL);
const exchange = rabbit.default();

exchange.rpcClient('rpc_queue', { n: 40 }, { timeout: 1000 }, console.log);
