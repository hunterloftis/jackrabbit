var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.default();
var hello = exchange.queue({ name: 'task_queue', durable: true });

exchange.publish({ name: 'Hunter' }, { key: 'task_queue' });
exchange.on('drain', process.exit);
