var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');

var RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';
var QUEUE_NAME = 'test.queue.' + Math.round(Math.random() * 100000);

describe('jackrabbit', function() {

  describe('#queue', function() {

    beforeEach(function connect(done) {
      this.broker = jackrabbit(RABBIT_URL);
      this.broker.once('connected', done);
    });

    describe('with a queue name', function() {

      it('returns a new Queue instance', function() {
        var queue = this.broker.queue(QUEUE_NAME);
        assert.instanceOf(queue, Queue);
      });

      it('emits ready when the queue has been asserted', function(done) {
        var queue = this.broker.queue(QUEUE_NAME);
        queue.on('ready', done);
      });

      it('defaults to a durable queue', function() {
        var queue = this.broker.queue(QUEUE_NAME);
        assert.equal(queue.durable, true);
      });

      it('defaults to a prefetch of 1', function() {
        var queue = this.broker.queue(QUEUE_NAME);
        assert.equal(queue.prefetch, 1);
      });
    });

    describe('with durability disabled in options', function() {

      it('returns a non-durable queue', function() {
        var queue = this.broker.queue(QUEUE_NAME + '.durability', { durable: false });
        assert.equal(queue.durable, false);
      });
    });

    describe('with prefetch of 5 in options', function() {

      before(function createQueue(done) {
        this.queue = this.broker.queue(QUEUE_NAME + '.prefetch', { prefetch: 5 });
        this.queue.on('ready', done);
      });

      before(function publishTen() {
        var i = 10;
        while (i--) this.queue.publish({ remaining: i });
      });

      it('returns a queue with prefetch of 5', function() {
        assert.equal(this.queue.prefetch, 5);
      });

      it('fetches 5 messages before pausing', function(done) {
        var i = 0;
        setTimeout(function checkFetched() {
          assert.equal(i, 5);
          done();
        }, 50);
        this.queue.subscribe(function handler(msg, acknowledge) {
          i++;
          assert.equal(msg.remaining, 10 - i);
          if (i > 5) throw new Error('Prefetched more than 5');
        });
      });
    });

    describe('with conflicting options', function() {

      before(function(done) {
        var queue = this.broker.queue(QUEUE_NAME + '.conflicting', { durable: false });
        queue.on('ready', done);
      });

      it('emits an error', function(done) {
        var queue = this.broker.queue(QUEUE_NAME + '.conflicting', { durable: true });
        queue.on('error', function(err) {
          assert.ok(err);
          done();
        });
      });

      it("doesn't emit ready", function(done) {
        setTimeout(done, 50);
        var queue = this.broker.queue(QUEUE_NAME + '.conflicting', { durable: true });
        queue.on('error', function() {});
        queue.on('ready', function() {
          throw new Error("Shouldn't emit ready");
        });
      });
    });
  });
});
