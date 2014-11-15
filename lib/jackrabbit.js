var amqp = require('amqplib');
var EventEmitter = require('events').EventEmitter;

var Queue = require('./queue');

function JackRabbit(url, prefetch) {
  if (!url) throw new Error('url required for jackrabbit connection');

  EventEmitter.call(this);

  this.connection = null;
  this.channel = null;
  this.prefetch = prefetch || 1;
  this.queues = {};

  amqp
    .connect(url)
    .then(this.createChannel.bind(this))
    .then(this.onChannel.bind(this))
    .catch(this.onConnectionErr.bind(this));
}

module.exports = function createJackRabbit(url, prefetch) {
  return new JackRabbit(url, prefetch);
};

JackRabbit.prototype = Object.create(EventEmitter.prototype);

JackRabbit.prototype.createChannel = function(connection) {
  this.connection = connection;
  this.connection.once('close', this.onClose.bind(this));
  return connection.createChannel();
};

JackRabbit.prototype.onChannel = function(channel) {
  this.channel = channel;

  // Create a reply queue
  this.channel.replyHandlers = {};
  this.channel.assertQueue('', { exclusive: true })
    .then(function(replyTo) {
      this.channel.replyName = replyTo.queue;
      this.channel.consume(this.replyName, this.onReply.bind(this), { noAck: true });
      this.emit('connected');
    }.bind(this));

  this.channel.on('close', this.onChannelClose.bind(this));
  this.channel.prefetch(this.prefetch);
};

JackRabbit.prototype.onReply = function(msg) {
  var id = msg.properties.correlationId;
  var replyHandler = this.channel.replyHandlers[id];
  if (!replyHandler) return;

  var body = msg.content.toString();
  var obj = JSON.parse(body);
  replyHandler(null, obj);
};

JackRabbit.prototype.close = function() {
  this.connection.close();
};

JackRabbit.prototype.onClose = function() {
  this.emit('disconnected');
};

JackRabbit.prototype.onConnectionErr = function(err) {
  this.emit('disconnected', err);
};

JackRabbit.prototype.onChannelClose = function() {
  this.emit('disconnected');
};

JackRabbit.prototype.queue = function(name, options) {
  return new Queue(this.channel, name, options);
};

JackRabbit.prototype.create = function(name, options, done) {
  if (!done) {
    if (typeof options === 'function') {
      done = options;
      options = {};
    }
    else {
      done = function() {};
    }
  }
  var queue = new Queue(this.channel, name, options);
  queue
    .once('ready', function onQueueReady(info) {
      this.queues[name] = queue;
      done(null, queue, info);
    }.bind(this))
    .once('error', function onQueueErr(err) {
      done(err);
    });
};

JackRabbit.prototype.destroy = function(name, done) {
  this.channel
    .deleteQueue(name)
    .then(onSuccess)
    .catch(onFail);

  function onSuccess() { done(null, true); }
  function onFail(err) { done(err); }
};

JackRabbit.prototype.purge = function(name, done) {
  this.channel
    .purgeQueue(name)
    .then(onSuccess)
    .catch(onFail);

  function onSuccess(response) { done(null, response.messageCount); }
  function onFail(err) { done(err); }
};

JackRabbit.prototype.publish = function(name, obj, replyHandler) {
  this.queues[name].publish(obj, replyHandler);
};

JackRabbit.prototype.handle = function(name, handler) {
  this.queues[name].subscribe(handler);
};

JackRabbit.prototype.ignore = function(name) {
  this.queues[name].unsubscribe();
};
