var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.direct('direct_logs');
var errors = exchange.queue({ exclusive: true, key: 'error' });
var logs = exchange.queue({ exclusive: true, keys: ['info', 'warning'] });

errors.consume(toDisk);
logs.consume(toConsole);

function toDisk(data, ack) {
  console.log('Writing to disk:', data.text);
  ack();
}

function toConsole(data, ack) {
  console.log('Writing to console:', data.text);
  ack();
}
