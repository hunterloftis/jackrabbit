var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.default();
var hello = exchange.queue({ name: 'jobs.hello', durable: true });

hello.consume(onGreet);

function onGreet(data, ack) {
  console.log('Hola, ' + data.name + '!');
  ack();
}
