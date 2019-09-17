'use strict';

const Assert = require('chai').assert;
const Amqp = require('amqplib/callback_api');
const Exchange = require('../lib/exchange');
const Uuid = require('uuid/v4');

const { before, describe, it } = require('mocha');

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

        before((done) => {

            Amqp.connect(process.env.RABBIT_URL, (err, conn) => {

                Assert.ok(!err);
                this.connection = conn;
                done();
            });
        });

        it('emits a "connected" event', (done) => {

            Exchange('', 'direct')
                .connect(this.connection)
                .once('connected', done);
        });
    });

    describe('#queue', () => {

        describe('with no options', () => {

            before((done) => {

                Amqp.connect(process.env.RABBIT_URL, (err, conn) => {

                    Assert.ok(!err);
                    this.connection = conn;
                    done();
                });
            });

            before(() => {

                this.q = Exchange('', 'direct')
                    .connect(this.connection)
                    .queue();
            });

            it('returns a queue instance', () => {

                Assert.ok(this.q.consume);
            });
        });

        describe('with key bindings', () => {

            before((done) => {

                const connect = (err, conn) => {

                    Assert.ok(!err);
                    this.exchange = Exchange('test.topic.bindings', 'topic')
                        .connect(conn)
                        .once('connected', done);
                };

                Amqp.connect(process.env.RABBIT_URL, connect.bind(this));
            });

            it('emits a "bound" event when all routing keys have been bound to the queue', (done) => {

                const keys = 'abcdefghijklmnopqrstuvwxyz'.split('');
                const finalKey = keys[keys.length - 1];
                const queue = this.exchange.queue({ keys });
                const message = Uuid();

                queue.consume((data, ack, nack, msg) => {

                    Assert.equal(message, data);
                    Assert.equal(msg.fields.routingKey, finalKey);
                    ack();
                    done();
                });

                queue.once('bound', () => {

                    this.exchange.publish(message, { key: finalKey });
                });
            });
        });
    });

    describe('#publish', () => {

    });
});
