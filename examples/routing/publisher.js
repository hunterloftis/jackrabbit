var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.direct('direct_logs');

exchange.publish({ text: 'this is a harmless log' }, { key: 'info' });
exchange.publish({ text: 'this one is more important' }, { key: 'warning' });
exchange.publish({ text: 'pay attention to me!' }, { key: 'error' });
