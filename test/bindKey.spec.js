/**
 * This test exposes a bug in that a queue with many routingKeys can be created,
 * and used before all routingKeys have been created.
 *
 */

// dependencies
var assert = require('chai').assert;
var jackrabbit = require('../lib/jackrabbit');
var uuid = require('node-uuid');


// variables
var queueName = 'test-queue-many-routing-keys';

describe.only('Queue creation', function () {
	before(function establishConnectionToRabbitMQ(done) {
		var that  = this;
		this.r = jackrabbit(process.env.RABBIT_URL);
		this.e = this.r.topic('test-bindKey');
		this.r.once('connected', function () {
			done();
		});
	});

	it('should have all routingKeys functional', function (done) {
		var uniqueMessage = uuid.v4();  // messages are unique between tests
		var exchange = this.e;
		var options = {
			keys: ['a', 'b', 'c', 'd', 'e']
		}
		var lastRoutingKey = options.keys[options.keys.length - 1];
		var q = this.e.queue(options);

		q.consume(function (data, ack, nack, msg) {
			assert.equal(uniqueMessage, data);
			assert.equal(msg.fields.routingKey, lastRoutingKey);
			done();
			ack();
		}, {});
		q.once('ready', function () {
			exchange.publish(uniqueMessage, { key: lastRoutingKey });
		});
	});
});