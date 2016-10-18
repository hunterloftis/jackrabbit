var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL || 'amqp://localhost');
var internals = rabbit.getInternals();
var exchange = rabbit.default();

exchange.publish({ n: 40 }, {
  key: 'rpc_queue',
  mandatory: true,
  reply: onReply,    // auto sends necessary info so the reply can come to the exclusive reply-to queue for this rabbit instance,
  notFound: notFound
});

function notFound() {
  console.log('Not Found');
  clearTimeout(id);
  rabbit.close();
}

var id = setTimeout(() => {
  console.log('Time Out');
  rabbit.close();
}, 3000);

function onReply(data) {
  clearTimeout(id);
  console.log('result:', data.result);
  rabbit.close();
}


