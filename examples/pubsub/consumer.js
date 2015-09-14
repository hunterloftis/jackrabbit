var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.fanout('logs');
var logs = exchange.queue({ exclusive: true });

logs.consume(onLog, { noAck: true });
// logs.consume(false); // stops consuming

function onLog(data) {
  console.log('Received log:', data.text);
}
