var amqp = require('amqplib/callback_api');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var queue = require('./queue');

var DEFAULT_EXCHANGES = {
  'direct': '',
  'fanout': 'amq.fanout',
  'topic': 'amq.topic'
};

var DEFAULT_EXCHANGE_OPTIONS = {
  durable: true,
  internal: false,
  autoDelete: false,
  alternateExchange: undefined
};

var DEFAULT_PUBLISH_OPTIONS = {
  contentType: 'application/json',
  mandatory: false,
  persistent: false,
  expiration: undefined,
  userId: undefined,
  CC: undefined,
  BCC: undefined
};

module.exports = exchange;

function exchange(name, type, options) {
  name = name || DEFAULT_EXCHANGES[type];
  if (!name && name !== '') {
    throw new Error('valid name and type required for exchange');
  }

  var connection;
  var emitter = _.extend(new EventEmitter(), {
    name: name,
    type: type,
    options: _.extend({}, DEFAULT_EXCHANGE_OPTIONS, options),
    queue: createQueue,
    connect: connect,
    publish: publish
  });

  return emitter;

  function connect(con) {
    connection = con;
    connection.createChannel(onChannel);
  }

  function createQueue(options) {
    var newQueue = queue(options);
    newQueue.on('close', bail.bind(this));
    emitter.once('ready', function() {      // instruct the queue to connect once our connection is established
      newQueue.connect(connection);
    });
    return newQueue;
  }

  function publish(message, options) {
    emitter.once('ready', function() {
      var opts = _.extend({}, DEFAULT_PUBLISH_OPTIONS, options);
      var msg = opts.contentType === 'application/json' ?
        JSON.stringify(message) : message;
      var drained = channel.publish(emitter.name, options.key, new Buffer(msg), opts);
      if (drained) drain();
    });
  }

  function bail(err) {
    // TODO: close all queue channels?
    connection = undefined;
    channel = undefined;
    emitter.emit('close', err);
  }

  function drain() {
    setImmediate(function() {
      emitter.emit('drain');
    });
  }

  function onChannel(err, chan) {
    if (err) return bail(err);
    channel = chan;
    channel.on('close', bail.bind(this, new Error('channel closed')));
    channel.on('drain', drain);
    emitter.emit('connected');
    if (DEFAULT_EXCHANGES[emitter.type] === emitter.name) {
      onExchange(undefined, { exchange: emitter.name });
    }
    else {
      channel.assertExchange(emitter.name, emitter.type, emitter.options, onExchange);
    }
  }

  function onExchange(err, info) {
    if (err) return bail(err);
    emitter.emit('ready');
  }
}
