const EventEmitter = require('events').EventEmitter

module.exports = async function Queue(connection, options = {}) {
  const replyTo = options.replyTo === undefined ? 'replyTo' : options.replyTo
  const correlationId = options.correlationId === undefined ? 'correlationId' : options.correlationId
  // TODO: leave original flags like noAck even if they're silly, ugly, verbose double-negatives?
  const noAck = options.noAck
  const rethrow = options.rethrow
  // requeue = 0, never requeue (one attempt)
  // requeue = 1, requeue original message (default) (two attempts)
  // requeue > 1, requeue everything (infinite attempts)
  const requeue = options.requeue === undefined ? 1 : options.requeue
  const allUpTo = options.prior === undefined ? false : options.prior
  const channel = await connection.createChannel()
  const queue = await channel.assertQueue(options.name, options)
  const instance = Object.assign(new EventEmitter(), {
    /**
     * get the name of the queue
     * @alias queue.name
     */
    name: queue.queue,
    close,
    bind,
    consume,
    cancel
  })
  let consumerTag

  if (options.prefetch) {
    channel.prefetch(options.prefetch)
  }
  instance.emit('connect')
  connection.on('close', () => instance.emit('disconnect'))
  channel.on('close', () => instance.emit('close', instance))
  channel.on('drain', () => instance.emit('drain'))

  return instance

  /**
   * Closes the queueu
   * @alias queue.close
   * @returns {promise}
   */
  async function close() {
    await channel.close()
  }

  /**
   * Bind the queue to an exchange
   * @alias queue.bind
   * @param {string} exchange
   * @param {string} key
   * @returns {promise}
   */
  async function bind(exchange, pattern) {
    if (exchange === '') return;  // can't bind to the default exchange
    await channel.bindQueue(instance.name, exchange, pattern)
  }

  /**
   * Start consuming a queue
   * @alias queue.consume
   * @param {function} consumer
   * @returns {promise}
   */
  async function consume(consumer) {
    if (consumerTag) {
      throw new Error('consume() called more than once')
    }
    consumerTag = await channel.consume(instance.name, onMessage, { noAck })

    async function onMessage(msg) {
      try {
        const result = await Promise.resolve(consumer(msg.content.toString(), msg))
        reply(msg, result)
        if (!noAck) channel.ack(msg, allUpTo)
      }
      catch (err) {
        if (!noAck) {
          const attempts = msg.fields.redelivered ? 2 : 1
          const shouldRequeue = requeue >= attempts
          channel.nack(msg, allUpTo, shouldRequeue)
        }
        if (rethrow) throw err
      }
    }
  }

  /**
   * Stop consuming a queue
   * @alias queue.cancel
   * @returns {promise}
   */
  async function cancel() {
    if (!consumerTag) return
    await channel.cancel(consumerTag)
    consumerTag = undefined
  }

  function reply(msg, result) {
    if (result === undefined) return
    const replyQueue = msg.properties[replyTo]
    const correlation = msg.properties[correlationId]
    if (replyQueue && correlation) {
      const correlation = { [correlationId]: msg.properties[correlationId] }
      const buffer = Buffer.from(String(result))
      const drained = channel.sendToQueue(replyQueue, buffer, correlation)
      if (drained) setImmediate(() => instance.emit('drain'))
    }
  }
}
