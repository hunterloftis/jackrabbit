var assert = require('chai').assert;
var amqp = require('amqplib/callback_api');
var uuid = require('uuid/v4');
var exchange = require('../lib/exchange');
var queue = require('../lib/queue');

describe('queue', function() {

  describe('consume', function() {

    before(createConnection);

    before(function() {
      this.name = `test.queue.consume.${ uuid() }`;
      this.exchange = exchange('', 'direct')
      this.exchange.connect(this.connection);
      this.queue = queue({ name: this.name });
      this.queue.connect(this.connection);
    })

    it('calls the message handler when a message arrives', function(done) {
      var message = uuid();
      var n = 3;
      var received = 0;

      this.queue.consume(onMessage, { noAck: true });

      for (var i = 0; i < n; i++) {
        this.exchange.publish(message, { key: this.name });
      }

      function onMessage(data, ack, nack, msg) {
        assert.equal(data, message);
        received++;
        if (received === n) done();
      }
    });
  });

  describe('cancel', function() {

    before(createConnection);

    before(function() {
      this.name = `test.queue.cancel.${ uuid() }`;
      this.exchange = exchange('', 'direct')
      this.exchange.connect(this.connection);
      this.queue = queue({ name: this.name });
      this.queue.connect(this.connection);
    });

    it('initially consumes messages', function(done) {
      var message = uuid();

      this.queue.consume(onMessage, { noAck: true });
      this.exchange.publish(message, { key: this.name });

      function onMessage(data, ack, nack, msg) {
        assert.equal(data, message);
        done();
      }
    });

    it('calls back with ok', function(done) {
      this.queue.cancel(done);
    });

    it('stops consuming after cancel', function(done) {
      this.exchange.publish('should not consume', {
        key: this.name,
        noAck: true
      });

      setTimeout(done, 250);
    });

  });

  describe('purge', function() {

    before(createConnection);

    before(function() {
      this.name = `test.queue.purge.${ uuid() }`;
      this.exchange = exchange('', 'direct')
      this.exchange.connect(this.connection);
      this.queue = queue({ name: this.name });
      this.queue.connect(this.connection);
    });

    before(function(done) {
      var n = 10;
      while(n--) {
        this.exchange.publish('test', { key: this.name });
      }
      setTimeout(done, 100);
    });

    it('returns the number of messages purged', function(done) {
      this.queue.purge(function(err, count) {
        assert.ok(count > 5);
        done(err);
      });
    });
  });
});

function createConnection(done) {
  amqp.connect(process.env.RABBIT_URL, function(err, conn) {
    assert.ok(!err);
    this.connection = conn;
    done();
  }.bind(this));
}
