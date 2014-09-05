var EventEmitter = require('events').EventEmitter;

function Queue(channel, name, options) {
  EventEmitter.call(this);

  this.handler = function() {};
  this.name = name;

  var ch = this.channel = channel;
  var opts = _.extend({}, DEFAULTS, options);

  ch
    .assertQueue(name, {
      durable: opts.durable
    })
    .then(function configQueue() {
      ch.prefetch(opts.prefetch);
      this.emit('ready');
    }.bind(this));
}

Queue.prototype = Object.create(EventEmitter.prototype);

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
