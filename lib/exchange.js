var amqp = require("amqplib/callback_api");
var _ = require("lodash");
var EventEmitter = require("events").EventEmitter;
var uuid = require("uuid");

var queue = require("./queue");

var DEFAULT_EXCHANGES = {
  direct: "amq.direct",
  fanout: "amq.fanout",
  topic: "amq.topic"
};

var DEFAULT_EXCHANGE_OPTIONS = {
  durable: true,
  internal: false,
  autoDelete: false,
  alternateExchange: undefined,
  noReply: false
};

var DEFAULT_PUBLISH_OPTIONS = {
  contentType: "application/json",
  mandatory: false,
  persistent: false,
  expiration: undefined,
  userId: undefined,
  CC: undefined,
  BCC: undefined
};

module.exports = exchange;

function exchange(name, type, options) {
  if (!type) {
    throw new Error("missing exchange type");
  }
  if (!isNameless(name)) {
    name = name || DEFAULT_EXCHANGES[type];
    if (!name) {
      throw new Error("missing exchange name");
    }
  }

  var ready = false;
  var connection, channel;
  var publishing = 0;
  var options = _.extend({}, DEFAULT_EXCHANGE_OPTIONS, options);
  var replyQueue = options.noReply ? null : queue({ exclusive: true });
  var pendingReplies = {};

  var emitter = _.extend(new EventEmitter(), {
    name: name,
    type: type,
    options: options,
    queue: createQueue,
    connect: connect,
    publish: publish
  });

  return emitter;

  function connect(con) {
    connection = con;
    connection.createChannel(onChannel);
    if (replyQueue) {
      replyQueue.on("close", bail.bind(this));
      replyQueue.consume(onReply, { noAck: true });
    }
    return emitter;
  }

  function createQueue(options) {
    var newQueue = queue(options);
    newQueue.on("close", bail.bind(this));
    newQueue.once("ready", function() {
      // the default exchange has implicit bindings to all queues
      if (!isNameless(emitter.name)) {
        var keys = options.keys || [options.key];
        bindKeys(keys)
          .then(function emitBoundEvent(res) {
            newQueue.emit("bound");
          })
          .catch(bail);
      }
    });

    if (connection) {
      newQueue.connect(connection);
    } else {
      emitter.once("ready", function() {
        newQueue.connect(connection);
      });
    }
    return newQueue;

    // return a promise when all keys are bound
    function bindKeys(keys) {
      return Promise.all(keys.map(bindKey));

      // returns a promise when a key is bound
      function bindKey(key) {
        return new Promise(function(resolve, reject) {
          channel.bindQueue(
            newQueue.name,
            emitter.name,
            key,
            {},
            function onBind(err, ok) {
              if (err) return reject(err);
              return resolve(ok);
            }
          );
        });
      }
    }
  }

  function publish(message, options) {
    publishing++;
    options = options || {};
    if (ready) sendMessage();
    else emitter.once("ready", sendMessage);
    return emitter;

    function sendMessage() {
      // TODO: better blacklisting/whitelisting of properties
      var opts = _.extend({}, DEFAULT_PUBLISH_OPTIONS, options);
      var msg = encodeMessage(message, opts.contentType);
      if (opts.reply) {
        opts.replyTo = replyQueue.name;
        opts.correlationId = uuid.v4();
        pendingReplies[opts.correlationId] = opts.reply;
        delete opts.reply;
      }
      var drained = channel.publish(
        emitter.name,
        opts.key,
        new Buffer(msg),
        opts
      );
      if (drained) onDrain();
    }
  }

  function encodeMessage(message, contentType) {
    if (contentType === "application/json") return JSON.stringify(message);
    return message;
  }

  function onReply(data, ack, nack, msg) {
    var replyCallback = pendingReplies[msg.properties.correlationId];
    if (replyCallback) replyCallback(data);
  }

  function bail(err) {
    // TODO: close all queue channels?
    connection = undefined;
    channel = undefined;
    emitter.emit("close", err);
  }

  function onDrain() {
    setImmediate(function() {
      publishing--;
      if (publishing === 0) {
        emitter.emit("drain");
      }
    });
  }

  function onChannel(err, chan) {
    if (err) return bail(err);
    channel = chan;
    channel.on("close", bail.bind(this, new Error("channel closed")));
    channel.on("drain", onDrain);
    emitter.emit("connected");
    if (isDefault(emitter.name, emitter.type) || isNameless(emitter.name)) {
      onExchange(undefined, { exchange: emitter.name });
    } else {
      channel.assertExchange(
        emitter.name,
        emitter.type,
        emitter.options,
        onExchange
      );
    }
  }

  function onExchange(err, info) {
    if (err) return bail(err);

    function onReady() {
      ready = true;
      emitter.emit("ready");
    }

    if (replyQueue) {
      replyQueue.connect(connection);
      replyQueue.once("ready", onReady);
    } else {
      onReady();
    }
  }

  function isDefault(name, type) {
    return DEFAULT_EXCHANGES[type] === name;
  }

  function isNameless(name) {
    return name === "";
  }
}
