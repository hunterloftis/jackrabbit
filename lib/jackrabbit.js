const amqp = require('amqplib')
const Exchange = require('./exchange')
const Queue = require('./queue')

module.exports = jackrabbit

/**
 * jackrabbit constructor
 * @param {string} url an amqp urlstring
 * @returns {jackrabbit} a broker instance
 */

function jackrabbit(url) {
  const actives = new Set()
  let connection

  return {
    queue,
    exchange,
    fanout: builtIn('fanout'),
    topic: builtIn('topic'),
    get connection() { return connection },
    get url() { return url }
  }

  function builtIn(type) {
    return async function (options = {}) {
      return await exchange(Object.assign(options, { type }))
    }
  }

  /**
   * Asserts an exchange
   * @alias jackrabbit.exchange
   * @param {object} options
   * @param {string} options.type the exchange type
   * @param {string} options.name the name of the exchange
   * @returns {Promise.<Exchange>} a promise for an exchange
   */
  async function exchange(options = {}) {
    connection = connection || await amqp.connect(url)
    try {
      const newExchange = await Exchange(connection, options)
      return registerExchange(newExchange)
    }
    catch (err) {
      closeIfEmpty()
      throw err
    }
  }

  async function queue(options = {}) {
    connection = connection || await amqp.connect(url)
    try {
      const newQueue = await Queue(connection, options)
      return registerQueue(newQueue)
    }
    catch (err) {
      closeIfEmpty()
      throw err
    }
  }

  function registerExchange(newExchange) {
    actives.add(newExchange)
    newExchange.once('close', removeActive)
    newExchange.on('queue', registerQueue)
    return newExchange
  }

  function registerQueue(newQueue) {
    actives.add(newQueue)
    newQueue.once('close', removeActive)
    return newQueue
  }

  async function closeIfEmpty() {
    if (actives.size === 0) {
      if (connection) await connection.close()
      connection = undefined
    }
  }

  async function removeActive(item) {
    if (!actives.delete(item)) {
      throw new Error('Tried to remove a nonexistant Exchange or Queue')
    }
    await closeIfEmpty()
  }
}
