var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.default();

exchange.rpcClient('rpc_queue', { n: 40 }, { timeout: 1000 }, console.log);
