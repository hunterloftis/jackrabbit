var amqp = require('amqplib');
var EventEmitter = require('events').EventEmitter;

var Queue = require('./queue');

function JackRabbit(url) {
  if (!url) throw new Error('url required for jackrabbit connection');

  EventEmitter.call(this);

  this.connection = null;
  this.channel = null;

  amqp
    .connect(url)
    .then(this.createChannel.bind(this))
    .then(this.onChannel.bind(this))
    .catch(this.onConnectionErr.bind(this));
}

module.exports = function createJackRabbit(url) {
  return new JackRabbit(url);
};

JackRabbit.prototype = Object.create(EventEmitter.prototype);

JackRabbit.prototype.createChannel = function(connection) {
  this.connection = connection;
  this.connection.once('close', this.onClose.bind(this));
  return connection.createChannel();
};

JackRabbit.prototype.onChannel = function(channel) {
  this.channel = channel;
  this.emit('connected');
};

JackRabbit.prototype.close = function() {
  this.connection.close();
};

JackRabbit.prototype.onClose = function() {
  this.emit('disconnected');
};

JackRabbit.prototype.onConnectionErr = function(err) {
  this.emit('disconnected');
  this.emit('error', err);
};

JackRabbit.prototype.queue = function(name, options) {
  return new Queue(this.channel, name, options);
};
