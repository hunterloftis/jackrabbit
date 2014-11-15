var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');
var util = require('./util');

describe('jackrabbit', function() {

  describe('constructor', function() {

    describe('without a url', function() {
      it('throws an error', function() {
        assert.throws(jackrabbit, 'url required for jackrabbit connection');
      });
    });

    describe('with a url', function() {

      describe('with a reachable service', function() {
        this.timeout(5000);

        it('emits "connected" on connection', function(done) {
          this.queue = jackrabbit(util.RABBIT_URL);
          this.queue.once('connected', done);
        });

        it('emits "disconnected" when you close the connection', function(done) {
          this.queue.once('disconnected', done);
          this.queue.close();
        })
      });

      describe('with an unreachable service', function() {

        it('emits "disconnected"', function(done) {
          var queue = jackrabbit('amqp://doesntexist');
          queue.once('disconnected', function(err) {
            assert.ok(err);
            done();
          });
        });

        it('emits "disconnected"', function(done) {
          var queue = jackrabbit('amqp://doesntexist');
          queue.once('error', function() {});
          queue.once('disconnected', function() {
            done();
          });
        });
      });
    });

    describe('without a prefetch value', function() {

      it('sets prefetch to 1', function() {
        var queue = jackrabbit(util.RABBIT_URL);
        assert.equal(queue.prefetch, 1);
      });
    });

    describe('with a prefetch value of 5', function() {

      it('sets prefetch to 5', function() {
        var queue = jackrabbit(util.RABBIT_URL, 5);
        assert.equal(queue.prefetch, 5);
      });
    });
  });
});
