var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL || 'amqp://localhost');
var internals = rabbit.getInternals();
var exchange = rabbit.default();

exchange.rpcClient('rpc_queue', { n: 30 }, console.log);
