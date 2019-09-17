'use strict';

const Amqp = require('amqplib/callback_api');
const Extend = require('lodash.assignin');
const EventEmitter = require('events').EventEmitter;
const Exchange = require('./exchange');

const jackrabbit = (url) => {

    if (!url) {
        throw new Error('url required for jackrabbit connection');
    }

    // public

    const getInternals = () => {

        return {
            amqp: Amqp,
            connection
        };
    };

    const close = (callback) => {

        if (!connection) {
            if (callback) {
                callback();
            }

            return;
        }

        try {
            // I don't think amqplib should be throwing here, as this is an async const
            // TODO: figure out how to test whether or not amqplib will throw
            // (eg, how do they determine if closing is an illegal operation?)
            connection.close((err) => {

                if (callback) {
                    callback(err);
                }

                rabbit.emit('close');
            });
        }
        catch (e) {
            if (callback) {
                callback(e);
            }
        }
    };

    const createDefaultExchange = () => {

        return createExchange()('direct', '');
    };

    const createExchange = () => {

        return (type, name, options) => {

            const newExchange = Exchange(name, type, options);
            if (connection) {
                newExchange.connect(connection);
            }
            else {
                rabbit.once('connected', () => {

                    newExchange.connect(connection);
                });
            }

            return newExchange;
        };
    };

    // private

    const bail = (err) => {

        // TODO close any connections or channels that remain open
        connection = undefined;
        if (err) {
            rabbit.emit('error', err);
        }
    };

    const onConnection = (err, conn) => {

        if (err) {
            return bail(err);
        }

        connection = conn;
        connection.on('close', bail.bind(this));
        rabbit.emit('connected');
    };

    // state
    let connection;

    const rabbit = Extend(new EventEmitter(), {
        default: createDefaultExchange,
        direct: createExchange().bind(null, 'direct'),
        fanout: createExchange().bind(null, 'fanout'),
        topic: createExchange().bind(null, 'topic'),
        exchange: createExchange(),
        close,
        getInternals
    });

    Amqp.connect(url, onConnection);
    return rabbit;
};

module.exports = jackrabbit;
