var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');

var RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';
var QUEUE_NAME = 'test.queue.' + Math.round(Math.random() * 100000);

describe('jackrabbit', function() {

  describe('#create', function() {

    describe('with a queue name', function() {

      before(function connect(done) {
        this.queue = jackrabbit(RABBIT_URL);
        this.queue.once('connected', done);
      });

      before(function create(done) {
        this.name = QUEUE_NAME;
        this.queue.create(this.name, function(err, instance) {
          this.instance = instance;
          done(err);
        }.bind(this));
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('calls back with the Queue instance', function() {
        assert.instanceOf(this.instance, Queue);
      });

      it('defaults to a durable queue', function() {
        assert.equal(this.instance.durable, true);
      });

      it('defaults to a prefetch of 1', function() {
        assert.equal(this.instance.prefetch, 1);
      });
    });

    describe('with durability disabled in options', function() {

      before(function connect(done) {
        this.queue = jackrabbit(RABBIT_URL);
        this.queue.once('connected', done);
      });

      before(function create(done) {
        this.name = QUEUE_NAME + '.durability';
        this.queue.create(this.name, { durable: false }, function(err, instance) {
          this.instance = instance;
          done(err);
        });
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('returns a non-durable queue', function() {
        assert.equal(this.instance.durable, false);
      });
    });

    describe('in a connection with prefetch 1', function() {

      before(function connect(done) {
        this.queue = jackrabbit(RABBIT_URL, 1);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = QUEUE_NAME + '.prefetch';
        this.queue.create(this.name, done);
      });

      before(function publishTen() {
        var i = 10;
        while (i--) this.queue.publish(this.name, { remaining: i });
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('knows to prefetch 1 message', function() {
        assert.equal(this.queue.prefetch, 1);
      });

      it('fetches 1 messages before pausing', function(done) {
        var i = 0;
        setTimeout(function checkFetched() {
          assert.equal(i, 1);
          done();
        }, 50);
        this.queue.handle(this.name, function handler(msg, acknowledge) {
          i++;
          assert.equal(msg.remaining, 10 - i);
          if (i > 1) throw new Error('Prefetched more than 1');
        });
      });
    });

    describe('in a connection with prefetch 5', function() {

      before(function connect(done) {
        this.queue = jackrabbit(RABBIT_URL, 5);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = QUEUE_NAME + '.prefetch';
        this.queue.create(this.name, done);
      });

      before(function publishTen() {
        var i = 10;
        while (i--) this.queue.publish(this.name, { remaining: i });
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('knows to prefetch 5 messages', function() {
        assert.equal(this.queue.prefetch, 5);
      });

      it('prefetches 5 messages in order', function(done) {
        var i = 0;
        setTimeout(function checkFetched() {
          assert.equal(i, 5);
          done();
        }, 50);
        this.queue.handle(this.name, function handler(msg, acknowledge) {
          i++;
          assert.equal(msg.remaining, 10 - i);
          if (i > 5) throw new Error('Prefetched more than 5');
        });
      });
    });

    describe('with conflicting options', function() {

      before(function connect(done) {
        this.queue = jackrabbit(RABBIT_URL);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = QUEUE_NAME + '.conflicting';
        this.queue.create(this.name, { durable: false }, done);
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('calls back with an error', function(done) {
        this.queue.create(this.name, { durable: true }, function(err, instance) {
          assert.ok(err);
          assert.ok(!instance);
          done();
        });
      });
    });
  });

  describe('#destroy', function() {

    before(function connect(done) {
      this.queue = jackrabbit(RABBIT_URL);
      this.queue.once('connected', done);
    });

    describe('with a queue that exists', function() {

      it('needs a queue', function(done) {
        this.name = QUEUE_NAME + '.destroy';
        this.queue.create(this.name, { durable: true }, done);
      });

      it('calls back without error', function(done) {
        this.broker.destroy(this.name, function(err, destroyed) {
          this.destroyed = destroyed;
          done(err);
        }.bind(this));
      });

      it('returns true that the queue was destroyed', function() {
        assert.ok(this.destroyed);
      });

      it('allows the queue to be replaced', function(done) {
        this.queue.create(this.name, { durable: false }, done);
      });
    });

    describe("with a queue that doesn't exist", function() {

      it('calls back without error', function(done) {
        this.broker.destroy('nonexistant.queue', function(err, destroyed) {
          this.destroyed = destroyed;
          done(err);
        }.bind(this));
      });

      it('returns false that the queue was destroyed', function() {
        assert.ok(!this.destroy);
      });
    });

    describe('without a queue name', function() {
      it('should throw an error', function() {
        assert.throws(this.queue.destroy);
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
