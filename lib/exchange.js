'use strict';

const Extend = require('lodash.assignin');
const EventEmitter = require('events').EventEmitter;
const Uuid = require('uuid/v4');

const Queue = require('./queue');

const DEFAULT_EXCHANGES = {
    'direct': 'amq.direct',
    'fanout': 'amq.fanout',
    'topic': 'amq.topic'
};

const DEFAULT_EXCHANGE_OPTIONS = {
    durable: true,
    noReply: true,
    internal: false,
    autoDelete: false,
    alternateExchange: undefined
};

const DEFAULT_PUBLISH_OPTIONS = {
    contentType: 'application/json',
    mandatory: false,
    persistent: false,
    expiration: undefined,
    userId: undefined,
    CC: undefined,
    BCC: undefined
};

const DEFAULT_RPC_CLIENT_OPTIONS = {
    timeout: 3000
};


const isDefault = (name, type) => {

    return DEFAULT_EXCHANGES[type] === name;
};

const isNameless = (name) => {

    return name === '';
};

const exchange = (name, type, exchangeOptions) => {

    if (!type) {
        throw new Error('missing exchange type');
    }

    if (!isNameless(name)) {
        name = name || DEFAULT_EXCHANGES[type];
        if (!name) {
            throw new Error('missing exchange name');
        }
    }

    let ready = false;
    let channel;
    let connection;
    let publishing = 0;
    const options = Extend({}, DEFAULT_EXCHANGE_OPTIONS, exchangeOptions);
    const replyQueue = options.noReply ? null : Queue({ exclusive: true });
    const pendingReplies = {};

    const rpcClient = (key, msg, rpcOptions, cb) => {

        if (!key) {
            throw new Error('missing rpc method');
        }

        if (!cb && typeof rpcOptions === 'const') {

            cb = rpcOptions;
        }

        if (!rpcOptions || typeof rpcOptions !== 'object') {
            rpcOptions = DEFAULT_RPC_CLIENT_OPTIONS;
        }

        const opts = Extend({}, {
            key,
            rpcCallback: cb
        }, rpcOptions);

        publish(msg, opts);
    };

    const rpcServer = (key, handler) => {

        const rpcQueue = createQueue({
            key,
            name: key,
            prefetch: 1,
            durable: false,
            autoDelete: true
        });
        rpcQueue.consume(handler);
    };

    const connect = (con) => {

        connection = con;
        connection.createChannel(onChannel);

        if (replyQueue) {
            replyQueue.on('close', bail.bind(this));
            replyQueue.consume(onReply, { noAck: true });
        }

        return emitter;
    };

    const createQueue = (queueOptions) => {

        // return a promise when all keys are bound
        const bindKeys = (keys) => {

            // returns a promise when a key is bound
            const bindKey = (key) => {

                return new Promise(((resolve, reject) => {

                    channel.bindQueue(newQueue.name, emitter.name, key, {}, (err, ok) => {

                        if (err) {
                            return reject(err);
                        }

                        return resolve(ok);
                    });
                }));
            };

            return Promise.all(keys.map(bindKey));
        };

        const newQueue = Queue(queueOptions);
        newQueue.on('close', bail.bind(this));
        newQueue.once('ready', () => {
            // the default exchange has implicit bindings to all queues
            if (!isNameless(emitter.name)) {
                const keys = queueOptions.keys || [queueOptions.key];
                bindKeys(keys)
                    .then((res) => {

                        newQueue.emit('bound');
                    })
                    .catch(bail);
            }
        });

        if (connection) {
            newQueue.connect(connection);
        }
        else {
            emitter.once('ready', () => {

                newQueue.connect(connection);
            });
        }

        return newQueue;
    };

    const publish = (message, publishOptions) => {

        const sendMessage = () => {
            // TODO: better blacklisting/whitelisting of properties
            const opts = Extend({}, DEFAULT_PUBLISH_OPTIONS, publishOptions);
            const msg = encodeMessage(message, opts.contentType);

            if (opts.reply) {
                if (!replyQueue) {
                    throw new Error('reply queue not found');
                }

                opts.replyTo = replyQueue.name;
                opts.correlationId = Uuid();
                pendingReplies[opts.correlationId] = opts.reply;
                delete opts.reply;
            }

            const drained = channel.publish(emitter.name, opts.key, Buffer.from(msg), opts);
            if (drained) {
                onDrain();
            }
        };

        const sendRpcMessage = () => {

            const opts = Extend({}, DEFAULT_PUBLISH_OPTIONS, publishOptions);
            const msg = encodeMessage(message, opts.contentType);

            let replied = false;
            const correlationId = Uuid();
            const rpcCallback = opts.rpcCallback;

            const onReply = (reply) => {

                clearTimeout(timeout);
                channel.removeListener('return', onNotFound);

                if (!replied) {
                    replied = true;
                    rpcCallback(reply);
                }
            };

            const onNotFound = (notFound) => {

                clearTimeout(timeout);
                clearPendingReply(correlationId);
                channel.removeListener('return', onNotFound);

                if (!replied) {
                    replied = true;
                    rpcCallback(new Error('Not Found'));
                }
            };

            const timeout = setTimeout(() => {

                clearPendingReply(correlationId);
                channel.removeListener('return', onNotFound);

                if (!replied) {
                    replied = true;
                    rpcCallback(new Error('Timeout'));
                }
            }, publishOptions.timeout || DEFAULT_RPC_CLIENT_OPTIONS.timeout);

            opts.replyTo = replyQueue.name;
            opts.correlationId = correlationId;
            opts.mandatory = true;

            pendingReplies[opts.correlationId] = onReply;
            channel.once('return', onNotFound);

            const drained = channel.publish(emitter.name, opts.key, Buffer.from(msg), opts);
            if (drained) {
                onDrain();
            }
        };

        publishing++;
        publishOptions = publishOptions || {};

        const sendMessageRef = publishOptions.rpcCallback ? sendRpcMessage : sendMessage;

        if (ready) {
            sendMessageRef();
        }
        else {
            emitter.once('ready', sendMessageRef);
        }

        return emitter;
    };

    const encodeMessage = (message, contentType) => {

        if (contentType === 'application/json') {
            return JSON.stringify(message);
        }

        return message;
    };

    const onReply = (data, ack, nack, msg) => {

        const replyCallback = pendingReplies[msg.properties.correlationId];
        if (replyCallback) {
            replyCallback(data);
        }

        clearPendingReply(msg.properties.correlationId);
    };

    const clearPendingReply = (correlationId) => {

        delete pendingReplies[correlationId];
    };

    const bail = (err) => {

        // TODO: close all queue channels?
        connection = undefined;
        channel = undefined;
        emitter.emit('close', err);
    };

    const onDrain = () => {

        setImmediate(() => {

            publishing--;
            if (publishing === 0) {
                emitter.emit('drain');
            }
        });
    };

    const onChannel = (err, chan) => {

        if (err) {
            return bail(err);
        }

        channel = chan;
        channel.on('close', bail.bind(this, new Error('channel closed')));
        channel.on('drain', onDrain);
        emitter.emit('connected');
        if (isDefault(emitter.name, DEFAULT_EXCHANGES[emitter.type]) || isNameless(emitter.name)) {
            onExchange(undefined, {
                exchange: emitter.name
            });
        }
        else {
            channel.assertExchange(emitter.name, emitter.type, emitter.options, onExchange);
        }
    };

    const onExchange = (err, info) => {

        if (err) {
            return bail(err);
        }

        if (!replyQueue) {
            ready = true;
            emitter.emit('ready');
        }

        else {
            replyQueue.connect(connection);
            replyQueue.once('ready', () => {

                ready = true;
                emitter.emit('ready');
            });
        }
    };

    const emitter = Extend(new EventEmitter(), {
        name,
        type,
        options: options,
        queue: createQueue,
        connect,
        publish,
        rpcClient,
        rpcServer
    });

    return emitter;
};

module.exports = exchange;
