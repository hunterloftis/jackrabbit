var amqp = require('amqplib/callback_api');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

const NOOP = function() {};
const DEFAULT_QUEUE_OPTIONS = {
  durable: true,
  exclusive: false,
  autoDelete: false,
  messageTtl: undefined,
  expires: undefined,
  deadLetterExchange: undefined,
  maxLength: undefined
};
// All brokers have a default exchange ('')

// Creating an unnamed channel ('') with exclusive: true
// creates a private channel that is named by the amqp server.
// http://www.squaremobius.net/amqp.node/doc/channel_api.html

// Channels are just 'light connections'
// https://www.rabbitmq.com/tutorials/amqp-concepts.html

module.exports = Jackrabbit;


function Jackrabbit(url, overrides) {
  if (!url) throw new Error('url required for jackrabbit connection');

  // PRIVATE STATE

  var options = _.extend({
    exchange: '',
    prefetch: 1
  }, overrides);
  var connection, channel;
  var handlers = {};
  var queues = {};

  // PUBLIC API

  var rabbit = new EventEmitter();
  _.extend(rabbit, {
    assert: assert,
    handle: handle,
    unhandle: unhandle,
    publish: publish,
    close: close,
    amqp: getAmqp
  });

  amqp.connect(url, onConnection);
  return rabbit;

  // PUBLIC METHODS

  // provide access to lower-level constructs
  function getAmqp() {
    return {
      connection: connection,
      channel: channel
    };
  }

  function assert(queueName, options, done) {
    var params = _.extend({}, DEFAULT_QUEUE_OPTIONS, options);
    done = done || NOOP;
    channel.assertQueue(queueName, params, onQueue);

    function onQueue(err, queue) {
      if (err) return done(err);
    }
  }

  // handle messages sent to queue 'queueName'
  function handle(queueName, handler, overrides) {
    assertQueue(queueName, overrides, onQueue);

    function onQueue(err, queue) {
      if (err) return bail(err);
      channel.consume(queueName, handler, options, onConsume);
    }

    function onConsume(err, obj) {
      if (err) return bail(err);
      // required to unsubscribe later
      handlers[queueName] = handlers[queueName] || [];
      handlers[queueName].push({
        tag: obj.consumerTag,
        handler: handler
      });
    }
  }

  // stop handling `queueName` messages
  function unhandle(queueName, handler) {
    // TODO: implement
  }

  // publish messages to the queue 'queueName'
  function publish(queueName, message, overrides) {
    var options = _.extend({
      exchange: '',
      routingKey: queueName,
      done: NOOP
    }, overrides);

    assertQueue(queueName, overrides, onQueue);

    function onQueue(err, queue) {
      if (err) return bail(err);
      var msg = new Buffer(message);
      channel.publish(options.exchange, options.routingKey, msg, options);
      options.done(undefined, queue);
    }
  }

  function close() {
    if (connection) connection.close();
  }

  // PRIVATE METHODS

  // TODO: what to do about unnamed queues?
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

    function onQueue(err, queue) {
      if (err) return done(err);
      queues[queueName] = true;
      done(undefined, queue);
    }
  }

  function bail(err) {
    connection = undefined;
    channel = undefined;
    handlers = {};
    queues = {};
    rabbit.emit('error', err);
  }

  function onConnection(err, conn) {
    if (err) {
      return bail(new Error('opening connection: ' + err.message));
    }
    connection = conn;
    connection.on('close', bail.bind(rabbit, new Error('connection closed')))
    connection.createChannel(onChannel);
  }

  function onChannel(err, chan) {
    if (err) {
      return bail(new Error('opening channel: ' + err.message));
    }
    channel = chan;
    channel.prefetch(options.prefetch);
    rabbit.emit('connected');
    channel.on('close', bail.bind(rabbit, new Error('channel closed')));
  }
}
