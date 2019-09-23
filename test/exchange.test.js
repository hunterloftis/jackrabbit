'use strict';

const Assert = require('chai').assert;
const Amqp = require('amqplib/callback_api');
const Exchange = require('../lib/exchange');
const Uuid = require('uuid/v4');

const { afterEach, beforeEach, describe, it } = require('mocha');

describe('exchange', () => {

    describe('constructor', () => {

        describe('with empty name (\'\') and direct type', () => {

            const e = Exchange('', 'direct');
            it('returns an exchange', () => {

                Assert.equal(e.name, '');
                Assert.equal(e.type, 'direct');
                Assert.ok(e.queue);
                Assert.ok(e.publish);
            });
        });

        describe('with no name', () => {

            describe('and a direct type', () => {

                const e = Exchange(undefined, 'direct');
                it('receives the default name amq.direct', () => {

                    Assert.equal(e.name, 'amq.direct');
                });
            });

            describe('and a fanout type', () => {

                const e = Exchange(undefined, 'fanout');
                it('receives the default name amq.fanout', () => {

                    Assert.equal(e.name, 'amq.fanout');
                });
            });

            describe('and a topic type', () => {

                const e = Exchange(undefined, 'topic');
                it('receives the default name amq.topic', () => {

                    Assert.equal(e.name, 'amq.topic');
                });
            });

            describe('and no type', () => {

                it('throws an error', () => {

                    Assert.throws(Exchange.bind(this, undefined, undefined), 'missing exchange type');
                });
            });
        });
    });

    describe('#connect', () => {

        let connection;

        beforeEach((done) => {

            Amqp.connect(process.env.RABBIT_URL, (err, conn) => {

                Assert.ok(!err);
                connection = conn;
                done();
            });
        });

        afterEach((done) => {

            connection.close(done);
        });

        it('emits a "connected" event', (done) => {

            Exchange('', 'direct')
                .connect(connection)
                .once('connected', done);
        });
    });

    describe('#queue', () => {

        let connection;

        beforeEach((done) => {

            Amqp.connect(process.env.RABBIT_URL, (err, conn) => {

                Assert.ok(!err);
                connection = conn;
                done();
            });
        });

        afterEach((done) => {

            connection.close(done);
        });

        describe('with no options', () => {

            it('returns a queue instance', (done) => {

                const queue = Exchange('', 'direct')
                    .connect(connection)
                    .queue({ exclusive: true });
                queue.on('connected', () => {

                    Assert.ok(queue.consume);
                    done();
                });
            });
        });

        describe('with key bindings', () => {

            let exchange;

            beforeEach((done) => {

                exchange = Exchange('test.topic.bindings', 'topic')
                    .connect(connection)
                    .once('connected', done);
            });

            it('emits a "bound" event when all routing keys have been bound to the queue', (done) => {

                const keys = 'abcdefghijklmnopqrstuvwxyz'.split('');
                const finalKey = keys[keys.length - 1];
                const queue = exchange.queue({ keys, exclusive: true });
                const message = Uuid();

                queue.consume((data, ack, nack, msg) => {

                    Assert.equal(message, data);
                    Assert.equal(msg.fields.routingKey, finalKey);
                    ack();
                    queue.cancel(done);
                });

                queue.once('bound', () => {

                    exchange.publish(message, { key: finalKey });
                });
            });
        });
    });
});
