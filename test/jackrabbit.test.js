'use strict';

const Assert = require('chai').assert;
const Jackrabbit = require('../lib/jackrabbit');

const { before, describe, it } = require('mocha');

describe('jackrabbit', () => {

    describe('constructor', () => {

        describe('with a valid server url', () => {

            it('emits a "connected" event', (done) => {

                this.r = Jackrabbit(process.env.RABBIT_URL);
                this.r.once('connected', done);
            });

            it('references a Connection object', () => {

                const c = this.r.getInternals().connection;
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

            before(() => {

                const r = Jackrabbit(process.env.RABBIT_URL);
                this.e = r.default();
            });

            it('returns a direct, nameless exchange', () => {

                Assert.ok(this.e.queue);
                Assert.ok(this.e.publish);
                Assert.equal(this.e.type, 'direct');
                Assert.equal(this.e.name, '');
            });
        });

        describe('with a "name" argument', () => {

            before(() => {

                const r = Jackrabbit(process.env.RABBIT_URL);
                this.e = r.default('foobar');
            });

            it('returns a direct, nameless exchange', () => {

                Assert.ok(this.e.queue);
                Assert.ok(this.e.publish);
                Assert.equal(this.e.type, 'direct');
                Assert.equal(this.e.name, '');
            });
        });

        describe('before connection is established', () => {

            it('passes the connection to the exchange', (done) => {

                Jackrabbit(process.env.RABBIT_URL)
                    .default()
                    .once('connected', done);
            });
        });

        describe('after connection is established', () => {

            before((done) => {

                this.r = Jackrabbit(process.env.RABBIT_URL);
                this.r.once('connected', done);
            });

            it('passes the connection to the exchange', (done) => {

                this.r
                    .default()
                    .once('connected', done);
            });
        });
    });

    describe('#direct', () => {

        describe('without a "name" argument', () => {

            before(() => {

                const r = Jackrabbit(process.env.RABBIT_URL);
                this.e = r.direct();
            });

            it('returns the direct exchange named "amq.direct"', () => {

                Assert.ok(this.e.queue);
                Assert.ok(this.e.publish);
                Assert.equal(this.e.type, 'direct');
                Assert.equal(this.e.name, 'amq.direct');
            });
        });

        describe('with a "name" argument of "foobar.direct"', () => {

            before(() => {

                const r = Jackrabbit(process.env.RABBIT_URL);
                this.e = r.direct('foobar.direct');
            });

            it('returns a direct exchange named "foobar.direct"', () => {

                Assert.ok(this.e.queue);
                Assert.ok(this.e.publish);
                Assert.equal(this.e.type, 'direct');
                Assert.equal(this.e.name, 'foobar.direct');
            });
        });

        describe('before connection is established', () => {

            it('passes the connection to the exchange', (done) => {

                Jackrabbit(process.env.RABBIT_URL)
                    .direct()
                    .once('connected', done);
            });
        });

        describe('after connection is established', () => {

            before((done) => {

                this.r = Jackrabbit(process.env.RABBIT_URL);
                this.r.once('connected', done);
            });

            it('passes the connection to the exchange', (done) => {

                this.r
                    .direct()
                    .once('connected', done);
            });
        });
    });

    describe('#fanout', () => {

        describe('without a "name" argument', () => {

            before(() => {

                const r = Jackrabbit(process.env.RABBIT_URL);
                this.e = r.fanout();
            });

            it('returns the direct exchange named "amq.fanout"', () => {

                Assert.ok(this.e.queue);
                Assert.ok(this.e.publish);
                Assert.equal(this.e.type, 'fanout');
                Assert.equal(this.e.name, 'amq.fanout');
            });
        });

        describe('with a "name" argument of "foobar.fanout"', () => {

            before(() => {

                const r = Jackrabbit(process.env.RABBIT_URL);
                this.e = r.fanout('foobar.fanout');
            });

            it('returns a direct exchange named "foobar.fanout"', () => {

                Assert.ok(this.e.queue);
                Assert.ok(this.e.publish);
                Assert.equal(this.e.type, 'fanout');
                Assert.equal(this.e.name, 'foobar.fanout');
            });
        });

        describe('before connection is established', () => {

            it('passes the connection to the exchange', (done) => {

                Jackrabbit(process.env.RABBIT_URL)
                    .fanout()
                    .once('connected', done);
            });
        });

        describe('after connection is established', () => {

            before((done) => {

                this.r = Jackrabbit(process.env.RABBIT_URL);
                this.r.once('connected', done);
            });

            it('passes the connection to the exchange', (done) => {

                this.r
                    .fanout()
                    .once('connected', done);
            });
        });
    });

    describe('#close', () => {

        before((done) => {

            this.r = Jackrabbit(process.env.RABBIT_URL);
            this.r.once('connected', done);
        });

        it('emits a "close" event', (done) => {

            this.r.close();
            this.r.once('close', done);
        });

        it('clears the connection', () => {

            Assert.ok(!this.r.getInternals().connection);
        });
    });
});
