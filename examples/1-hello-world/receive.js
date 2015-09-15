var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.default();
var hello = exchange.queue({ name: 'hello' });

hello.consume(onMessage, { noAck: true });

function onMessage(data) {
  console.log('received:', data);
}
