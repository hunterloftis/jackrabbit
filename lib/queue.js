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

  this.replyHandlers = {};

  this.channel
    .assertQueue(name, {
      durable: this.durable
    })
    .then(function createReplyQueue(info) {
      this.info = info;
      return this.channel.assertQueue('', { exclusive: true });
    }.bind(this))
    .then(function configQueue(replyTo) {
      this.replyName = replyTo.queue;
      this.emit('ready', this.info);
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

  this.channel.consume(this.replyName, this.onReply.bind(this));

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
  this.handler(obj, function(reply) {
    if (reply && msg.properties.replyTo) {
      var replyBuffer = new Buffer(JSON.stringify(reply));
      this.channel.sendToQueue(msg.properties.replyTo, replyBuffer, {
        correlationId: msg.properties.correlationId
      });
    }
    this.channel.ack(msg);
  }.bind(this));
};

Queue.prototype.publish = function(obj, replyHandler) {
  var msg = JSON.stringify(obj);
  var id = uuid.v4();
  if (replyHandler) this.replyHandlers[id] = replyHandler;
  this.channel.sendToQueue(this.name, new Buffer(msg), {
    persistent: true,
    correlationId: id,
    replyTo: replyHandler ? this.replyName : undefined
  });
};

Queue.prototype.onReply = function(msg) {
  var id = msg.properties.correlationId;
  var replyHandler = this.replyHandlers[id];
  if (!replyHandler) return;

  var body = msg.content.toString();
  var obj = JSON.parse(body);
  replyHandler(null, obj);
};

Queue.prototype.onError = function(err) {
  this.emit('error', err);
};
