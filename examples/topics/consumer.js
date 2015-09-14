var jackrabbit = require('jackrabbit');

var rabbit = jackrabbit(RABBIT_URL);
var exchange = rabbit.topic('topic_animals');

exchange
  .queue({ exclusive: true, key: '*.orange.*' })
  .consume(first);

exchange
  .queue({ exclusive: true, keys: [ '*.*.rabbit', 'lazy.#' ] })
  .consume(second);

function first(data, ack) {
  console.log('First:', data.text);
  ack();
}

function second(data, ack) {
  console.log('Second:', data.text);
  ack();
}
