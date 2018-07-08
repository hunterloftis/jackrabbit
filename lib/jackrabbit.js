var amqp = require('amqplib/callback_api');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var exchange = require('./exchange');

module.exports = jackrabbit;

function jackrabbit(url, options) {
  if (!url) throw new Error('url required for jackrabbit connection');

  // state
  var connection;

  var rabbit = _.extend(new EventEmitter(), {
    default: createDefaultExchange,
    direct: createExchange('direct'),
    fanout: createExchange('fanout'),
    topic: createExchange('topic'),
    close: close,
    getInternals: getInternals
  });

  amqp.connect(url, options || {}, onConnection);
  return rabbit;

  // public

  function getInternals() {
    return {
      amqp: amqp,
      connection: connection
    };
  }

  function close(callback) {
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

  function createDefaultExchange(options) {
    return createExchange('direct')('', options);
  }

  function createExchange(type) {
    return function(name, options) {
      var newExchange = exchange(name, type, options);
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
    rabbit.emit('error', err);
  }

  function onConnection(err, conn) {
    if (err) return bail(err);
    connection = conn;
    connection.on('close', bail.bind(this));
    rabbit.emit('connected');
  }
}
