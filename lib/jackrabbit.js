var amqp = require('amqplib/callback_api');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var exchange = require('./exchange');

module.exports = jackrabbit;

function jackrabbit(url) {
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
    connection.close(callback);
  }

  function createDefaultExchange() {
    return createExchange('direct')('');
  }

  function createExchange(type) {
    return function(name) {
      var newExchange = exchange(name, type);
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
