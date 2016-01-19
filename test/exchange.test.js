var assert = require('chai').assert;
var amqp = require('amqplib/callback_api');
var exchange = require('../lib/exchange');
var uuid = require('node-uuid');

describe('exchange', function() {

  describe('constructor', function() {

    describe("with empty name ('') and direct type", function() {
      var e = exchange('', 'direct');
      it('returns an exchange', function() {
        assert.equal(e.name, '');
        assert.equal(e.type, 'direct');
        assert.ok(e.queue);
        assert.ok(e.publish);
      });
    });

    describe('with no name', function() {

      describe('and a direct type', function() {
        var e = exchange(undefined, 'direct');
        it('receives the default name amq.direct', function() {
          assert.equal(e.name, 'amq.direct');
        });
      });

      describe('and a fanout type', function() {
        var e = exchange(undefined, 'fanout');
        it('receives the default name amq.fanout', function() {
          assert.equal(e.name, 'amq.fanout');
        });
      });

      describe('and a topic type', function() {
        var e = exchange(undefined, 'topic');
        it('receives the default name amq.topic', function() {
          assert.equal(e.name, 'amq.topic');
        });
      });

      describe('and no type', function() {
        it('throws an error', function() {
          assert.throws(exchange.bind(this, undefined, undefined), 'missing exchange type');
        });
      });
    });
  });

  describe('#connect', function() {
    before(function(done) {
      amqp.connect(process.env.RABBIT_URL, function(err, conn) {
        assert.ok(!err);
        this.connection = conn;
        done();
      }.bind(this));
    });
    it('emits a "connected" event', function(done) {
      exchange('', 'direct')
        .connect(this.connection)
        .once('connected', done);
    });
  });

  describe('#queue', function() {
    describe('with no options', function() {
      before(function(done) {
        amqp.connect(process.env.RABBIT_URL, function(err, conn) {
          assert.ok(!err);
          this.connection = conn;
          done();
        }.bind(this));
      });
      before(function() {
        this.q = exchange('', 'direct')
          .connect(this.connection)
          .queue();
      });
      it('returns a queue instance', function() {
        assert.ok(this.q.consume);
      });
    });

    describe('with key bindings', function () {
      before(function(done) {
        amqp.connect(process.env.RABBIT_URL, function(err, conn) {
          assert.ok(!err);
          this.exchange = exchange('test.topic.bindings', 'topic')
            .connect(conn)
            .once('connected', done);
        }.bind(this));
      });

    	it('emits a "bound" event when all routing keys have been bound to the queue', function (done) {
        var keys = 'abcdefghijklmnopqrstuvwxyz'.split('');
        var finalKey = keys[keys.length - 1];
        var queue = this.exchange.queue({ keys: keys });
        var message = uuid.v4();

    		queue.consume(function (data, ack, nack, msg) {
    			assert.equal(message, data);
    			assert.equal(msg.fields.routingKey, finalKey);
    			ack();
          done();
    		});

    		queue.once('bound', function () {
    			this.exchange.publish(message, { key: finalKey });
    		}.bind(this));
    	});
    });
  });

  describe('#publish', function() {

  });
});
