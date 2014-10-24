var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');
var util = require('./util');

describe('jackrabbit', function() {

  describe('#create', function() {

    describe('with a queue name', function() {

      before(function connect(done) {
        this.queue = jackrabbit(util.RABBIT_URL);
        this.queue.once('connected', done);
      });

      before(function create(done) {
        this.name = util.NAME;
        this.queue.create(this.name, function(err, instance, info) {
          this.instance = instance;
          this.info = info;
          done(err);
        }.bind(this));
      });

      after(function cleanup(done) {
        this.queue.destroy(this.name, done);
      });

      it('calls back with the Queue instance', function() {
        assert.instanceOf(this.instance, Queue);
      });

      it('defaults to a durable queue', function() {
        assert.equal(this.instance.durable, true);
      });
	  
      it('server queue name matches', function() {
        assert.equal(this.info.queue, this.name);
      });
	  
      it('doesnt have awaiting messages', function() {
        assert.equal(this.info.messageCount, 0);
      });

    });

    describe('with durability disabled in options', function() {

      before(function connect(done) {
        this.queue = jackrabbit(util.RABBIT_URL);
        this.queue.once('connected', done);
      });

      before(function create(done) {
        this.name = util.NAME + '.durability';
        this.queue.create(this.name, { durable: false }, function(err, instance) {
          this.instance = instance;
          done(err);
        }.bind(this));
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('returns a non-durable queue', function() {
        assert.equal(this.instance.durable, false);
      });
    });

    describe('with conflicting options', function() {

      before(function connect(done) {
        this.queue = jackrabbit(util.RABBIT_URL);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = util.NAME + '.conflicting';
        this.queue.create(this.name, { durable: false }, done);
      });

      after(function reconnect(done) {
        this.queue = jackrabbit(util.RABBIT_URL);
        this.queue.once('connected', done);
      });

      after(function cleanup(done) {
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
      this.queue = jackrabbit(util.RABBIT_URL);
      this.queue.once('connected', done);
    });

    describe('with a queue that exists', function() {

      it('needs a queue', function(done) {
        this.name = util.NAME + '.destroy';
        this.queue.create(this.name, { durable: true }, done);
      });

      it('calls back without error', function(done) {
        this.queue.destroy(this.name, function(err, destroyed) {
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
        this.queue.destroy('nonexistant.queue', function(err, destroyed) {
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
});
