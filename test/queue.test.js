var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');

var RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';
var QUEUE_NAME = 'test.queue.' + Math.round(Math.random() * 100000);
var QUEUES = [];

function name(suffix) {
  var n = QUEUE_NAME + '.' + suffix;
  if (QUEUES.indexOf(n) === -1) QUEUES.push(n);
  return n;
}

describe('jackrabbit', function() {

  describe('#queue', function() {

    beforeEach(function connect(done) {
      this.broker = jackrabbit(RABBIT_URL);
      this.broker.once('connected', done);
    });

    describe('with a queue name', function() {

      it('returns a new Queue instance', function() {
        var queue = this.broker.queue(name());
        assert.instanceOf(queue, Queue);
      });

      it('emits ready when the queue has been asserted', function(done) {
        var queue = this.broker.queue(name());
        queue.on('ready', done);
      });

      it('defaults to a durable queue', function() {
        var queue = this.broker.queue(name());
        assert.equal(queue.durable, true);
      });

      it('defaults to a prefetch of 1', function() {
        var queue = this.broker.queue(name());
        assert.equal(queue.prefetch, 1);
      });
    });

    describe('with durability disabled in options', function() {

      it('returns a non-durable queue', function() {
        var queue = this.broker.queue(name('durability'), { durable: false });
        assert.equal(queue.durable, false);
      });
    });

    describe('with prefetch of 1', function() {

      before(function createQueue(done) {
        this.queue = this.broker.queue(name('prefetch1'), { prefetch: 1 });
        this.queue.on('ready', done);
      });

      before(function publishTen() {
        var i = 10;
        while (i--) this.queue.publish({ remaining: i });
      });

      it('returns a queue with prefetch of 1', function() {
        assert.equal(this.queue.prefetch, 1);
      });

      it('fetches 1 messages before pausing', function(done) {
        var i = 0;
        setTimeout(function checkFetched() {
          assert.equal(i, 1);
          done();
        }, 50);
        this.queue.subscribe(function handler(msg, acknowledge) {
          i++;
          assert.equal(msg.remaining, 10 - i);
          if (i > 1) throw new Error('Prefetched more than 1');
        });
      });
    });

    describe('with prefetch of 5', function() {

      before(function createQueue(done) {
        this.queue = this.broker.queue(name('prefetch5'), { prefetch: 5 });
        this.queue.on('ready', done);
      });

      before(function publishTen() {
        var i = 10;
        while (i--) this.queue.publish({ remaining: i });
      });

      it('returns a queue with prefetch of 5', function() {
        assert.equal(this.queue.prefetch, 5);
      });

      it('prefetches 5 messages in order', function(done) {
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
        var queue = this.broker.queue(name('conflicting'), { durable: false });
        queue.on('ready', done);
      });

      it('emits an error', function(done) {
        var queue = this.broker.queue(name('conflicting'), { durable: true });
        queue.on('error', function(err) {
          assert.ok(err);
          done();
        });
      });

      it("doesn't emit ready", function(done) {
        setTimeout(done, 50);
        var queue = this.broker.queue(name('conflicting'), { durable: true });
        queue.on('error', function() {});
        queue.on('ready', function() {
          throw new Error("Shouldn't emit ready");
        });
      });
    });
  });

  describe('#destroy', function() {

    beforeEach(function connect(done) {
      this.broker = jackrabbit(RABBIT_URL);
      this.broker.once('connected', done);
    });

    describe('with a queue that exists', function() {
      it('needs a queue', function(done) {
        var queue = this.broker.queue(name('destroy'), { durable: true });
        queue.on('ready', done);
      });

      it('calls back without error', function(done) {
        this.broker.destroy(name('destroy'), done);
      });

      it('allows the queue to be replaced', function(done) {
        var queue = this.broker.queue(name('destroy'), { durable: false });
        queue.on('ready', done);
      });
    });

    describe("with a queue that doesn't exist", function() {
      it('should return a failure', function() {

      });
    });

    describe('without a queue name', function() {
      it('should throw an error', function() {

      });
    });
  });

  after(function connect(done) {
    this.broker = jackrabbit(RABBIT_URL);
    this.broker.once('connected', done);
  });

  after(function cleanup(done) {
    QUEUES.forEach(function(name) {
      this.broker.destroy(name);
    }.bind(this));
  });
});
