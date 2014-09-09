var EventEmitter = require('events').EventEmitter;

function Queue(channel, name, options) {
  EventEmitter.call(this);
  options = options || {};

  this.handler = function() {};
  this.name = name;
  this.channel = channel;
  this.durable = options.durable !== void 0 ? options.durable : true;

  this.channel
    .assertQueue(name, {
      durable: this.durable
    })
    .then(function configQueue() {
      this.emit('ready');
    }.bind(this))
    .catch(this.onError.bind(this));
}

Queue.prototype = Object.create(EventEmitter.prototype);

module.exports = Queue;

Queue.prototype.subscribe = function(handler) {
  this.handler = handler;
  this.channel.consume(this.name, this.onMessage.bind(this));
};

Queue.prototype.onMessage = function(msg) {
  var body = msg.content.toString();
  var obj = JSON.parse(body);
  this.handler(obj, function() {
    this.channel.ack(msg);
  }.bind(this));
};

Queue.prototype.publish = function(job) {
  var msg = JSON.stringify(job);
  this.channel.sendToQueue(this.name, new Buffer(msg), { deliveryMode: true });
};

Queue.prototype.onError = function(err) {
  this.emit('error', err);
};
