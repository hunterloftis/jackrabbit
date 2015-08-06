var amqp = require('amqplib/callback_api');

// All brokers have a default exchange ('')

// Creating a channel named '' and exclusive: true
// creates a private channel that is named by the amqp server.
// http://www.squaremobius.net/amqp.node/doc/channel_api.html

// Channels are just 'light connections'
// https://www.rabbitmq.com/tutorials/amqp-concepts.html

module.exports = Jackrabbit;

function Jackrabbit(url, overrides) {
  if (!url) throw new Error('url required for jackrabbit connection');

  // Extend default options with overrides
  options = _.extend({
    exchange: '',
    prefetch: 1
  }, overrides);

  var connection, channel, queues;
  var queues = {};
  var handlers = [];

  // Expose public methods
  var rabbit = {
    handle: handle,
    publish: publish,
    close: close
  };

  EventEmitter.call(rabbit);
  amqp.connect(url, onConnection);
  return rabbit;

  // handle messages sent to queue 'queueName'
  function handle(queueName, handler, overrides) {
    assertQueue(queueName, options, onQueue);

    function onQueue(err, queue) {
      if (err) return bail(err);
      channel.consume(queueName, handler, options);
    }
  }

  // publish messages to the queue 'queueName'
  function publish(queueName, data, overrides) {
    // first, assert that the queue exists
    if (queues[queueName]) onQueue(undefined, queues[queueName]);
    else channel.assertQueue(queueName, options, onQueue);
  }

  function close() {
    if (connection) connection.close();
  }

  function assertQueue(name, overrides, done) {
    if (queues[queueName]) {
      return onQueue(undefined, queues[queueName]);
    }
    var options = _.extend({
      exclusive: false,
      durable: true,
      messageTtl: undefined,
      maxLength: undefined
    }, overrides);

    channel.assertQueue(queueName, options, onQueue);

    function onQueue(err) {
      if (err) return done(err);
      queues[queueName] = true;
    }
  }

  function bail(err) {
    connection = undefined;
    channel = undefined;
    rabbit.emit('error', err);
  }

  function onConnection(err, conn) {
    if (err) return bail(err);
    connection = conn;
    connection.on('close', bail.bind(new Error('connection closed')));
    connection.createChannel(onChannel);
  }

  function onChannel(err, chan) {
    if (err) return bail(err);
    channel = chan;
    channel.on('close', bail.bind(new Error('channel closed')));
    channel.prefetch(options.prefetch);
  }
}
