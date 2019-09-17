'use strict';

const Assert = require('chai').assert;
const Amqp = require('amqplib/callback_api');
const Uuid = require('uuid/v4');
const Exchange = require('../lib/exchange');
const Queue = require('../lib/queue');

const { describe, before, it } = require('mocha');

const createConnection = (done) => {

    const connect = (err, conn) => {

        Assert.ok(!err);
        this.connection = conn;
        done();
    };

    Amqp.connect(process.env.RABBIT_URL, connect.bind(this));
};

describe('queue', () => {

    describe('consume', () => {

        before(createConnection);

        before(() => {

            this.name = `test.queue.consume.${ Uuid() }`;
            this.exchange = Exchange('', 'direct');
            this.exchange.connect(this.connection);
            this.queue = Queue({ name: this.name });
            this.queue.connect(this.connection);
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

            this.queue.consume(onMessage, { noAck: true });

            for (let i = 0; i < n; ++i) {
                this.exchange.publish(message, { key: this.name });
            }
        });
    });

    describe('cancel', () => {

        before(createConnection);

        before(() => {

            this.name = `test.queue.cancel.${ Uuid() }`;
            this.exchange = Exchange('', 'direct');
            this.exchange.connect(this.connection);
            this.queue = Queue({ name: this.name });
            this.queue.connect(this.connection);
        });

        it('initially consumes messages', (done) => {

            const onMessage = (data, ack, nack, msg) => {

                Assert.equal(data, message);
                done();
            };

            const message = Uuid();

            this.queue.consume(onMessage, { noAck: true });
            this.exchange.publish(message, { key: this.name });
        });

        it('calls back with ok', (done) => {

            this.queue.cancel(done);
        });

        it('stops consuming after cancel', (done) => {

            this.exchange.publish('should not consume', {
                key: this.name,
                noAck: true
            });

            setTimeout(done, 250);
        });

    });

    describe('purge', () => {

        before(createConnection);

        before(() => {

            this.name = `test.queue.purge.${ Uuid() }`;
            this.exchange = Exchange('', 'direct');
            this.exchange.connect(this.connection);
            this.queue = Queue({ name: this.name });
            this.queue.connect(this.connection);
        });

        before((done) => {

            let n = 10;
            while (n--) {
                this.exchange.publish('test', { key: this.name });
            }

            setTimeout(done, 100);
        });

        it('returns the number of messages purged', (done) => {

            this.queue.purge((err, count) => {

                Assert.ok(count > 5);
                done(err);
            });
        });
    });
});
