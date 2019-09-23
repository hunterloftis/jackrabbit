'use strict';

const Assert = require('chai').assert;
const Amqp = require('amqplib/callback_api');
const Uuid = require('uuid/v4');
const Exchange = require('../lib/exchange');
const Queue = require('../lib/queue');

const { afterEach, beforeEach, describe, it } = require('mocha');

describe('queue', () => {

    let connection;
    let exchange;

    beforeEach((done) => {

        const connect = (err, conn) => {

            Assert.ok(!err);
            connection = conn;
            exchange = Exchange('', 'direct');
            exchange.connect(connection);
            done();
        };

        Amqp.connect(process.env.RABBIT_URL, connect.bind(this));
    });

    afterEach((done) => {

        connection.close(done);
    });

    describe('consume', () => {

        let name;
        let queue;

        beforeEach((done) => {

            name = `test.queue.consume`;
            queue = Queue({ name, durable: false, exclusive: true });
            queue.on('connected', done);
            queue.connect(connection);
        });

        afterEach((done) => {

            queue.purge(() => {

                queue.cancel(done);
            });
        });

        it('calls the message handler when a message arrives', (done) => {

            const onMessage = (data, ack, nack, msg) => {

                Assert.equal(data, message);
                received++;
                if (received === n) {
                    done();
                }
            };

            const message = Uuid();
            const n = 3;
            let received = 0;

            queue.consume(onMessage, { noAck: true });

            for (let i = 0; i < n; ++i) {
                exchange.publish(message, { key: name });
            }
        });

        it('calls back with ok', (done) => {

            queue.on('consuming', done);
            queue.consume(() => { });
        });

        it('initially consumes messages', (done) => {

            const onMessage = (data) => {

                Assert.equal(data, message);
                done();
            };

            const message = Uuid();

            queue.consume(onMessage, { noAck: true });
            exchange.publish(message, { key: name });
        });
    });

    describe('cancel', () => {

        let queue;
        let name;

        beforeEach((done) => {

            name = `test.cancel`;
            queue = Queue({ name, durable: false, exclusive: true });
            queue.on('connected', done);
            queue.connect(connection);
        });

        afterEach((done) => {

            queue.purge(() => {

                queue.cancel(done);
            });
        });

        it('stops consuming after cancel', (done) => {

            queue.consume(() => {

                done(new Error('should not consume'));
            });

            queue.on('consuming', () => {

                queue.cancel(() => {

                    exchange.publish('should not publish', { key: name });
                    setTimeout(done, 50);
                });
            });
        });
    });

    describe('purge', () => {

        let name;
        let queue;
        let messageCount;

        beforeEach((done) => {

            name = `test.queue.purge`;
            queue = Queue({ name, durable: false, exclusive: true });
            queue.on('connected', () => {

                messageCount = 10;
                for (let i = 0; i < messageCount; ++i) {
                    exchange.publish('test', { key: name });
                }

                setTimeout(done, 50);
            });
            queue.connect(connection);
        });

        it('returns the number of messages purged', (done) => {

            queue.purge((err, count) => {

                Assert.equal(count, messageCount);
                done(err);
            });
        });
    });
});
