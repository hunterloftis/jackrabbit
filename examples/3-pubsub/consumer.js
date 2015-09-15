var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.fanout();
var logs = exchange.queue({ exclusive: true });

logs.consume(onLog, { noAck: true });
// logs.consume(false); // stops consuming

function onLog(data) {
  console.log('Received log:', data);
}
