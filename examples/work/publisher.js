var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.default();
var hello = exchange.queue({ name: 'jobs.hello', durable: true });

exchange.publish({ name: 'Hunter' }, { key: 'jobs.hello' });
