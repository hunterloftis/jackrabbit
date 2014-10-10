var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');
var util = require('./util');

describe('jackrabbit', function() {

  describe('#publish', function() {

    before(function connect(done) {
      this.queue = jackrabbit(util.RABBIT_URL, 1);
      this.queue.once('connected', done);
    });

    before(function createQueue(done) {
      this.name = util.NAME + '.fivemessages';
      this.queue.create(this.name, done);
    });

    it('sends five messages without error', function() {
      for (var i = 0; i < 5; i++) {
        this.queue.publish(this.name, { index: i });
      }
    });

    describe('#handle', function() {

      before(function(done) {
        this.messages = [];
        setTimeout(done, 50);
        this.queue.handle(this.name, function handler(msg, ack) {
          this.messages.push(msg);
          ack();
        }.bind(this));
      });

      it('receives five messages', function() {
        assert.lengthOf(this.messages, 5);
      });

      it('receives messages in order', function() {
        for (var i = 0; i < 5; i++) {
          assert.equal(this.messages[i].index, i);
        }
      });
    });
  });

  describe('#ignore', function() {

    before(function connect(done) {
      this.queue = jackrabbit(util.RABBIT_URL, 1);
      this.queue.once('connected', done);
    });

    before(function createQueue(done) {
      this.name = util.NAME + '.ignore';
      this.queue.create(this.name, done);
    });

    before(function startHandling() {
      this.messages = [];
      this.queue.handle(this.name, function handler(msg, ack) {
        this.messages.push(msg);
        ack();
      }.bind(this));
    });

    it('starts out handling a queue', function(done) {
      this.queue.publish(this.name, { foo: 'bar' });
      setTimeout(function() {
        assert.lengthOf(this.messages, 1);
        done();
      }.bind(this), 50);
    });

    it('stops handling the queue after calling ignore', function(done) {
      this.queue.ignore(this.name);
      this.queue.publish(this.name, { foo: 'bar' });
      setTimeout(function() {
        assert.lengthOf(this.messages, 1);
        done();
      }.bind(this), 50);
    });
  });

  describe('with prefetch 1', function() {

    before(function connect(done) {
      this.queue = jackrabbit(util.RABBIT_URL, 1);
      this.queue.once('connected', done);
    });

    before(function createQueue(done) {
      this.name = util.NAME + '.prefetch';
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

  describe('with prefetch 5', function() {

    before(function connect(done) {
      this.queue = jackrabbit(util.RABBIT_URL, 5);
      this.queue.once('connected', done);
    });

    before(function createQueue(done) {
      this.name = util.NAME + '.prefetch';
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

  describe('#purge', function() {
    describe('with five pending messages', function() {
      before(function connect(done) {
        this.queue = jackrabbit(util.RABBIT_URL, 1);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = util.NAME + '.purgeFive';
        this.queue.create(this.name, done);
      });

      before(function queueMessages() {
        for (var i = 0; i < 5; i++) {
          this.queue.publish(this.name, { index: i });
        }
      });

      it('purges without error', function(done) {
        this.queue.purge(this.name, function onPurge(err, count) {
          assert.ok(!err);
          this.count = count;
          done();
        }.bind(this));
      });

      it('counts 5 purged messages', function() {
        assert.equal(this.count, 5);
      });

      it('receives 0 messages', function(done) {
        setTimeout(countIt.bind(this), 50);

        this.messages = [];
        this.queue.handle(this.name, function handler(msg, ack) {
          this.messages.push(msg);
          ack();
        }.bind(this));

        function countIt() {
          assert.lengthOf(this.messages, 0);
          done();
        }
      });
    });

    describe('with no pending messages', function() {
      before(function connect(done) {
        this.queue = jackrabbit(util.RABBIT_URL, 1);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = util.NAME + '.purgeEmpty';
        this.queue.create(this.name, done);
      });

      it('purges without error', function(done) {
        this.queue.purge(this.name, function onPurge(err, count) {
          assert.ok(!err);
          this.count = count;
          done();
        }.bind(this));
      });

      it('counts 0 purged messages', function() {
        assert.equal(this.count, 0);
      });
    });
  });
});
