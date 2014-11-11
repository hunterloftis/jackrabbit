var EventEmitter = require('events').EventEmitter;

function Queue(channel, name, options) {
  EventEmitter.call(this);
  
  this.handler = function() {};
  this.name = name;
  this.channel = channel;
  this.options = options || {};
  if(this.options.durable === void 0)
	this.options.durable = true;
  this.tag = null;

  this.channel
    .assertQueue(name, this.options)
    .then(function configQueue(info) {
      this.emit('ready', info);
    }.bind(this))
    .catch(this.onError.bind(this));
}

Queue.prototype = Object.create(EventEmitter.prototype);

module.exports = Queue;

Queue.prototype.subscribe = function(handler) {
  this.handler = handler;
  var tag = this.channel
    .consume(this.name, this.onMessage.bind(this))
    .then(saveTag.bind(this))
    .catch(this.onError.bind(this));

  // TODO: is there a race condition here if this isn't called before unsubscribe?
  function saveTag(obj) {
    this.tag = obj.consumerTag;
  }
};

Queue.prototype.unsubscribe = function() {
  this.channel.cancel(this.tag);
  this.handler = null;
  this.tag = null;
};

Queue.prototype.onMessage = function(msg) {
  if (!msg) return;
  var body = msg.content.toString();
  var obj = JSON.parse(body);
  this.handler(obj, function() {
    this.channel.ack(msg);
  }.bind(this));
};

Queue.prototype.publish = function(obj, options, cb) {
  options = options || {};
  // fallback for previous version
  if (typeof(options) == 'function' && !cb) {
    cb = options;
	options = {};
  }
  if (options.deliveryMode === void 0)
	options['deliveryMode'] = true;
  var msg = JSON.stringify(obj);
  this.channel.sendToQueue(this.name, new Buffer(msg), options, cb);
};

Queue.prototype.onError = function(err) {
  this.emit('error', err);
};
