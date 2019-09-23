'use strict';

const Assert = require('chai').assert;
const Jackrabbit = require('../lib/jackrabbit');

const { after, afterEach, before, beforeEach, describe, it } = require('mocha');

describe('jackrabbit', () => {

    let rabbit;

    beforeEach((done) => {

        rabbit = Jackrabbit(process.env.RABBIT_URL);
        rabbit.once('connected', done);
    });

    afterEach((done) => {

        rabbit.close(done);
    });

    describe('constructor', () => {

        describe('with a valid server url', () => {

            it('references a Connection object', () => {

                const c = rabbit.getInternals().connection;
                Assert.ok(c.connection.stream.writable);
            });
        });

        describe('without a server url', () => {

            it('throws a "url required" error', () => {

                Assert.throws(Jackrabbit, 'url required');
            });
        });

        // describe('with an invalid url', () => {
        //   it('emits an "error" event', (done) => {
        //     jackrabbit('amqp://1.2')
        //       .once('error', function(err) {
        //         assert.ok(err);
        //         done();
        //       });
        //   });
        // });

    });

    describe('#default', () => {

        describe('without a "name" argument', () => {

            let exchange;

            beforeEach(() => {

                exchange = rabbit.default();
            });

            it('returns a direct, nameless exchange', () => {

                Assert.ok(exchange.queue);
                Assert.ok(exchange.publish);
                Assert.equal(exchange.type, 'direct');
                Assert.equal(exchange.name, '');
            });
        });

        describe('with a "name" argument', () => {

            let exchange;

            before(() => {

                exchange = rabbit.default('foobar');
            });

            it('returns a direct, nameless exchange', () => {

                Assert.ok(exchange.queue);
                Assert.ok(exchange.publish);
                Assert.equal(exchange.type, 'direct');
                Assert.equal(exchange.name, '');
            });
        });

        describe('before connection is established', () => {

            let beforeRabbit;

            beforeEach(() => {

                beforeRabbit = Jackrabbit(process.env.RABBIT_URL);
            });

            it('passes the connection to the exchange', (done) => {

                beforeRabbit
                    .default()
                    .once('connected', done);
            });

            afterEach((done) => {

                beforeRabbit.close(done);
            });
        });

        describe('after connection is established', () => {

            it('passes the connection to the exchange', (done) => {

                rabbit
                    .default()
                    .once('connected', done);
            });
        });
    });

    describe('#direct', () => {

        describe('without a "name" argument', () => {

            let exchange;

            beforeEach(() => {

                exchange = rabbit.direct();
            });

            it('returns the direct exchange named "amq.direct"', () => {

                Assert.ok(exchange.queue);
                Assert.ok(exchange.publish);
                Assert.equal(exchange.type, 'direct');
                Assert.equal(exchange.name, 'amq.direct');
            });
        });

        describe('with a "name" argument of "foobar.direct"', () => {

            let exchange;

            beforeEach(() => {

                exchange = rabbit.direct('foobar.direct');
            });

            it('returns a direct exchange named "foobar.direct"', () => {

                Assert.ok(exchange.queue);
                Assert.ok(exchange.publish);
                Assert.equal(exchange.type, 'direct');
                Assert.equal(exchange.name, 'foobar.direct');
            });
        });

        describe('before connection is established', () => {

            let beforeRabbit;

            before(() => {

                beforeRabbit = Jackrabbit(process.env.RABBIT_URL);
            });

            it('passes the connection to the exchange', (done) => {

                beforeRabbit
                    .direct()
                    .once('connected', done);
            });

            after((done) => {

                beforeRabbit.close(done);
            });
        });

        describe('after connection is established', () => {

            it('passes the connection to the exchange', (done) => {

                rabbit
                    .direct()
                    .once('connected', done);
            });
        });
    });

    describe('#fanout', () => {

        describe('without a "name" argument', () => {

            let exchange;

            before(() => {

                exchange = rabbit.fanout();
            });

            it('returns the direct exchange named "amq.fanout"', () => {

                Assert.ok(exchange.queue);
                Assert.ok(exchange.publish);
                Assert.equal(exchange.type, 'fanout');
                Assert.equal(exchange.name, 'amq.fanout');
            });
        });

        describe('with a "name" argument of "foobar.fanout"', () => {

            let exchange;

            before(() => {

                exchange = rabbit.fanout('foobar.fanout');
            });

            it('returns a direct exchange named "foobar.fanout"', () => {

                Assert.ok(exchange.queue);
                Assert.ok(exchange.publish);
                Assert.equal(exchange.type, 'fanout');
                Assert.equal(exchange.name, 'foobar.fanout');
            });
        });

        describe('before connection is established', () => {

            let beforeRabbit;

            before(() => {

                beforeRabbit = Jackrabbit(process.env.RABBIT_URL);
            });

            it('passes the connection to the exchange', (done) => {

                beforeRabbit
                    .fanout()
                    .once('connected', done);
            });

            after((done) => {

                beforeRabbit.close(done);
            });
        });

        describe('after connection is established', () => {

            it('passes the connection to the exchange', (done) => {

                rabbit
                    .fanout()
                    .once('connected', done);
            });
        });
    });

    describe('#close', () => {

        it('clears the connection', (done) => {

            rabbit.close(() => {

                rabbit.getInternals().connection.on('close', () => {

                    Assert.ok(!rabbit.getInternals().connection);
                    done();
                });
            });
        });
    });
});
