var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.default();

exchange.rpcServer('rpc_queue', onRequest)

function onRequest(data, reply) {
  console.log('got request for n:', data.n);
  reply({ result: fib(data.n) });
}

function fib(n) {
  if (n === 0) return 0;
  if (n === 1) return 1;
  return fib(n - 1) + fib(n - 2);
}
