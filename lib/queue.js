'use strict';

const amqp = require('amqplib/callback_api');
const extend = require('lodash.assignin');
const EventEmitter = require('events').EventEmitter;

const DEFAULT_QUEUE_OPTIONS = {
  exclusive: false,
  durable: true,
  prefetch: 1,              // can be set on the queue because we use a per-queue channel
  messageTtl: undefined,
  maxLength: undefined
};

const DEFAULT_CONSUME_OPTIONS = {
  consumerTag: undefined,
  noAck: false,
  exclusive: false,
  priority: undefined
};

module.exports = queue;

function queue(options) {
  options = options || {};
  let channel, consumerTag;
  const emitter = extend(new EventEmitter(), {
    name: options.name,
    options: extend({}, DEFAULT_QUEUE_OPTIONS, options),
    connect: connect,
    consume: consume,
    cancel: cancel,
    purge: purge
  });

  return emitter;

  function connect(connection) {
    connection.createChannel(onChannel);
  }

  function consume(callback, options) {
    emitter.once('ready', function() {
      const opts = extend({}, DEFAULT_CONSUME_OPTIONS, options);
      channel.consume(emitter.name, onMessage, opts, onConsume);
    });

    function onMessage(msg) {
      const data = parseMessage(msg);
      if (!data) return;

      callback(data, ack, nack, msg);

      function ack(reply) {
        const replyTo = msg.properties.replyTo;
        const id = msg.properties.correlationId;
        if (replyTo && id) {
          const buffer = encodeMessage(reply, msg.properties.contentType);
          channel.publish('', replyTo, buffer, {
            correlationId: id,
            contentType: msg.properties.contentType
          });
        }
        channel.ack(msg);
      }

      function nack(opts) {
        opts = opts || {};
        opts.allUpTo = opts.allUpTo !== undefined ? opts.allUpTo : false;
        opts.requeue = opts.requeue !== undefined ? opts.requeue : true;
        channel.nack(msg, opts.allUpTo, opts.requeue);
      }
    }
  }

  function cancel(done) {
    if (!consumerTag) return;
    if (!channel) return;
    channel.cancel(consumerTag, done);
  }

  function purge(done) {
    if (channel) {
      channel.purgeQueue(emitter.name, onPurged);
    } else {
      emitter.once('ready', function() {
        channel.purgeQueue(emitter.name, onPurged);
      });
    }

    function onPurged(err, obj) {
      if (err) return done(err);
      done(undefined, obj.messageCount);
    }
  }

  function encodeMessage(message, contentType) {
    if (contentType === 'application/json') {
      return new Buffer(JSON.stringify(message));
    }
    return new Buffer(message.toString());
  }

  function parseMessage(msg) {
    if (msg.properties.contentType === 'application/json') {
      try {
        return JSON.parse(msg.content.toString());
      }
      catch (e) {
        emitter.emit('error', new Error('unable to parse message as JSON'));
        return;
      }
    }
    return msg.content;
  }

  function onConsume(err, info) {
    if (err) return bail(err);
    consumerTag = info.consumerTag; // required to stop consuming
    emitter.emit('consuming');
  }

  function bail(err) {
    // TODO: close the channel if still open
    channel = undefined;
    emitter.name = undefined;
    consumerTag = undefined;
    emitter.emit('close', err);
  }

  function onChannel(err, chan) {
    if (err) return bail(err);
    channel = chan;
    channel.prefetch(emitter.options.prefetch);
    channel.on('close', bail.bind(this, new Error('channel closed')));
    emitter.emit('connected');
    channel.assertQueue(emitter.name, emitter.options, onQueue);
  }

  function onQueue(err, info) {
    if (err) return bail(err);
    emitter.name = info.queue;
    emitter.emit('ready');
  }
}
