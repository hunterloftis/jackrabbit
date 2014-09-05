var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');

var RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';

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
          this.broker = jackrabbit(RABBIT_URL);
          this.broker.once('connected', done);
        });

        it('emits "disconnected" when you close the connection', function(done) {
          this.broker.once('disconnected', done);
          this.broker.close();
        })
      });

      describe('with an unreachable service', function() {

        it('emits "error"', function(done) {
          var broker = jackrabbit('amqp://doesntexist');
          broker.once('error', function(err) {
            assert.ok(err);
            done();
          });
        });

        it('emits "disconnected"', function(done) {
          var broker = jackrabbit('amqp://doesntexist');
          broker.once('error', function() {});
          broker.once('disconnected', function() {
            done();
          });
        });
      });
    });

  });
});
