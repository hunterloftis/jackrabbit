'use strict';

var amqp = require('amqplib/callback_api');
var extend = require('lodash.assignin');
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid/v4');

var queue = require('./queue');

var DEFAULT_EXCHANGES = {
  'direct': 'amq.direct',
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

var DEFAULT_RPC_CLIENT_OPTIONS = {
  timeout: 3000
};

module.exports = exchange;

function exchange(name, type, options) {
  if (!type) {
    throw new Error('missing exchange type');
  }
  if (!isNameless(name)) {
    name = name || DEFAULT_EXCHANGES[type];
    if (!name) {
      throw new Error('missing exchange name');
    }
  }

  var ready = false;
  var connection, channel;
  var publishing = 0;
  var replyQueue = queue({ exclusive: true });
  var pendingReplies = {};

  var emitter = extend(new EventEmitter(), {
    name: name,
    type: type,
    options: extend({}, DEFAULT_EXCHANGE_OPTIONS, options),
    queue: createQueue,
    connect: connect,
    publish: publish,
    rpcClient: rpcClient,
    rpcServer: rpcServer
  });

  return emitter;

  function rpcClient(key, msg, options, cb) {

    if (!key) {
      throw new Error('missing rpc method');
    }

    if (!cb && typeof options === 'function') {
      cb = options;
    }

    if (!options || typeof options !== 'object') {
      options = DEFAULT_RPC_CLIENT_OPTIONS;
    }

    var opts = extend({}, {
      key: key,
      rpcCallback: cb
    }, options);

    publish(msg, opts);
  }

  function rpcServer(key, handler) {
    var rpcQueue = createQueue({
      key: key,
      name: key,
      prefetch: 1,
      durable: false,
      autoDelete: true
    });
    rpcQueue.consume(handler);
  }

  function connect(con) {
    connection = con;
    connection.createChannel(onChannel);
    replyQueue.on('close', bail.bind(this));
    replyQueue.consume(onReply, { noAck: true });
    return emitter;
  }

  function createQueue(options) {
    var newQueue = queue(options);
    newQueue.on('close', bail.bind(this));
    newQueue.once('ready', function () {
      // the default exchange has implicit bindings to all queues
      if (!isNameless(emitter.name)) {
        var keys = options.keys || [options.key];
        bindKeys(keys)
          .then(function emitBoundEvent(res) {
            newQueue.emit('bound')
          })
          .catch(bail);
      }
    });

    if (connection) {
      newQueue.connect(connection);
    } else {
      emitter.once('ready', function () {
        newQueue.connect(connection);
      });
    }
    return newQueue;

    // return a promise when all keys are bound
    function bindKeys(keys) {
      return Promise.all(keys.map(bindKey));

      // returns a promise when a key is bound
      function bindKey(key) {
        return new Promise(function (resolve, reject) {
          channel.bindQueue(newQueue.name, emitter.name, key, {}, function onBind(err, ok) {
            if (err) return reject(err);
              return resolve(ok);
          });
        });
      }
    }
  }

  function publish(message, options) {

    publishing++;
    options = options || {};

    var sendMessageRef = options.rpcCallback ? sendRpcMessage : sendMessage;

    if (ready) {
      sendMessageRef();
    } else {
      emitter.once('ready', sendMessageRef);
    }

    return emitter;

    function sendMessage() {
      // TODO: better blacklisting/whitelisting of properties
      var opts = extend({}, DEFAULT_PUBLISH_OPTIONS, options);
      var msg = encodeMessage(message, opts.contentType);

      if (opts.reply) {
        opts.replyTo = replyQueue.name;
        opts.correlationId = uuid();
        pendingReplies[opts.correlationId] = opts.reply;
        delete opts.reply;
      }

      var drained = channel.publish(emitter.name, opts.key, new Buffer(msg), opts);
      if (drained) onDrain();
    }

    function sendRpcMessage() {

      var opts = extend({}, DEFAULT_PUBLISH_OPTIONS, options);
      var msg = encodeMessage(message, opts.contentType);

      var replied = false;
      var correlationId = uuid();
      var rpcCallback = opts.rpcCallback;

      function onReply(reply) {

        clearTimeout(timeout);
        channel.removeListener('return', onNotFound);

        if (!replied) {
          replied = true;
          rpcCallback(reply);
        }
      }

      function onNotFound(notFound) {

        clearTimeout(timeout);
        clearPendingReply(correlationId);
        channel.removeListener('return', onNotFound);

        if (!replied) {
          replied = true;
          rpcCallback(new Error('Not Found'));
        }
      }

      var timeout = setTimeout(function () {

        clearPendingReply(correlationId);
        channel.removeListener('return', onNotFound);

        if (!replied) {
          replied = true;
          rpcCallback(new Error('Timeout'));
        }
      }, options.timeout || DEFAULT_RPC_CLIENT_OPTIONS.timeout);

      opts.replyTo = replyQueue.name;
      opts.correlationId = correlationId;
      opts.mandatory = true;

      pendingReplies[opts.correlationId] = onReply;
      channel.once('return', onNotFound);

      var drained = channel.publish(emitter.name, opts.key, new Buffer(msg), opts);
      if (drained) onDrain();
    }
  }

  function encodeMessage(message, contentType) {
    if (contentType === 'application/json') return JSON.stringify(message);
    return message;
  }

  function onReply(data, ack, nack, msg) {
    var replyCallback = pendingReplies[msg.properties.correlationId];
    if (replyCallback) replyCallback(data);
    clearPendingReply(msg.properties.correlationId);
  }

  function clearPendingReply(correlationId) {
    delete pendingReplies[correlationId];
  }

  function bail(err) {
    // TODO: close all queue channels?
    connection = undefined;
    channel = undefined;
    emitter.emit('close', err);
  }

  function onDrain() {
    setImmediate(function () {
      publishing--;
      if (publishing === 0) {
        emitter.emit('drain');
      }
    });
  }

  function onChannel(err, chan) {
    if (err) return bail(err);
    channel = chan;
    channel.on('close', bail.bind(this, new Error('channel closed')));
    channel.on('drain', onDrain);
    emitter.emit('connected');
    if (isDefault(emitter.name, emitter.type) || isNameless(emitter.name)) {
      onExchange(undefined, {
        exchange: emitter.name
      });
    } else {
      channel.assertExchange(emitter.name, emitter.type, emitter.options, onExchange);
    }
  }

  function onExchange(err, info) {
    if (err) return bail(err);
    replyQueue.connect(connection);
    replyQueue.once('ready', function () {
      ready = true;
      emitter.emit('ready');
    });
  }

  function isDefault(name, type) {
    return DEFAULT_EXCHANGES[type] === name;
  }

  function isNameless(name) {
    return name === '';
  }
}
