var assert = require('chai').assert;
var jackrabbit = require('..');
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
          this.rabbit = jackrabbit(util.RABBIT_URL);
          this.rabbit.once('connected', done);
        });

        it('emits "error: channel closed" when you close the connection', function(done) {
          this.rabbit.once('error', function(err) {
            assert.equal(err.message, 'channel closed');
            done();
          });
          this.rabbit.close();
        })
      });

      describe('with an unreachable service', function() {

        it('emits "error" with ENOTFOUND', function(done) {
          var queue = jackrabbit('amqp://doesntexist');
          queue.once('error', function(err) {
            assert.include(err.message, 'ENOTFOUND');
            done();
          });
        });
      });
    });
  });

});
