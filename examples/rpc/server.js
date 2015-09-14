var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.default();
var rpc = exchange.queue({ name: 'rpc_queue', prefetch: 1 });

rpc.consume(onRequest);

function onRequest(data, reply) {
  reply({ result: fib(data.n) });
}

function fib(n) {
  if (n === 0) return 0;
  if (n === 1) return 1;
  return fib(n - 1) + fib(n - 2);
}
