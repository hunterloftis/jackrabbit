var assert = require('chai').assert;
var jackrabbit = require('..');
var Queue = require('../lib/queue');

var RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';

describe('jackrabbit', function() {

  describe('Queues', function() {
    describe('jackrabbit#queue', function() {

      beforeEach(function connect(done) {
        this.broker = jackrabbit(RABBIT_URL);
        this.broker.once('connected', done);
      });

      describe('with a queue name', function() {

        it('returns a new Queue instance', function() {
          var queue = this.broker.queue('test.queue');
          assert.instanceOf(queue, Queue);
        });

        it('emits ready when the queue has been asserted', function(done) {
          var queue = this.broker.queue('test.queue');
          queue.on('ready', done);
        });
      });
    });
  });

});
