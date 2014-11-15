var EventEmitter = require('events').EventEmitter;
var uuid = require('node-uuid');

function Queue(channel, name, options) {
  EventEmitter.call(this);
  options = options || {};

  this.handler = function() {};
  this.name = name;
  this.replyName = null;
  this.channel = channel;
  this.durable = options.durable !== void 0 ? options.durable : true;
  this.tag = null;

  this.channel
    .assertQueue(name, {
      durable: this.durable
    })
    .then(function createReplyQueue(info) {
      this.emit('ready', info);
    }.bind(this));
}

Queue.prototype = Object.create(EventEmitter.prototype);

module.exports = Queue;

Queue.prototype.subscribe = function(handler) {
  this.handler = handler;
  var tag = this.channel
    .consume(this.name, this.onMessage.bind(this))
    .then(saveTag.bind(this));

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
  var hasReply = msg.properties.replyTo;

  if (hasReply) this.channel.ack(msg);
  this.handler(obj, function(reply) {
    if (hasReply) {
      var replyBuffer = new Buffer(JSON.stringify(reply));
      this.channel.sendToQueue(msg.properties.replyTo, replyBuffer, {
        correlationId: msg.properties.correlationId
      });
    }
    else {
      this.channel.ack(msg);
    }
  }.bind(this));
};

Queue.prototype.publish = function(obj, replyHandler) {
  var msg = JSON.stringify(obj);
  var id = uuid.v4();
  if (replyHandler) {
    this.channel.replyHandlers[id] = replyHandler;
  }
  this.channel.sendToQueue(this.name, new Buffer(msg), {
    persistent: !replyHandler,
    correlationId: id,
    replyTo: replyHandler ? this.channel.replyName : undefined
  });
};
