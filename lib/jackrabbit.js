'use strict';

const amqp = require('amqplib/callback_api');
const extend = require('lodash.assignin');
const EventEmitter = require('events').EventEmitter;
const exchange = require('./exchange');

module.exports = jackrabbit;

function jackrabbit(url) {
  if (!url) throw new Error('url required for jackrabbit connection');

  // state
  let connection;

  const rabbit = extend(new EventEmitter(), {
    default: createDefaultExchange,
    direct: createExchange().bind(null, 'direct'),
    fanout: createExchange().bind(null, 'fanout'),
    topic: createExchange().bind(null, 'topic'),
    exchange: createExchange(),
    close: close,
    getInternals: getInternals
  });

  amqp.connect(url, onConnection);
  return rabbit;

  // public

  function getInternals() {
    return {
      amqp: amqp,
      connection: connection
    };
  }

  function close(callback) {
    if (!connection) {
      if (callback) callback();
      return;
    }
    try {
      // I don't think amqplib should be throwing here, as this is an async function
      // TODO: figure out how to test whether or not amqplib will throw
      // (eg, how do they determine if closing is an illegal operation?)
      connection.close(function(err) {
        if (callback) callback(err);
        rabbit.emit('close');
      });
    }
    catch (e) {
      if (callback) callback(e);
    }
  }

  function createDefaultExchange() {
    return createExchange()('direct', '');
  }

  function createExchange() {
    return function(type, name, options) {
      const newExchange = exchange(name, type, options);
      if (connection) {
        newExchange.connect(connection);
      }
      else {
        rabbit.once('connected', function() {
          newExchange.connect(connection);
        });
      }
      return newExchange;
    };
  }

  // private

  function bail(err) {
    // TODO close any connections or channels that remain open
    connection = undefined;
    channel = undefined;
    if (err) rabbit.emit('error', err);
  }

  function onConnection(err, conn) {
    if (err) return bail(err);
    connection = conn;
    connection.on('close', bail.bind(this));
    rabbit.emit('connected');
  }
}
