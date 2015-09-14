var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.fanout('logs');

exchange.publish({ text: 'this is a log' });
