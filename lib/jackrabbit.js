const amqp = require('amqplib')
const EventEmitter = require('events').EventEmitter
const uuid = require('uuid')

const BUILT_IN_EXCHANGES = {
  'direct': 'amq.direct',
  'fanout': 'amq.fanout',
  'topic': 'amq.topic'
}

module.exports = (url) => {
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
      const name = options.name || BUILT_IN_EXCHANGES[type]
      return await exchange(Object.assign({ name, type }, options))
    }
  }

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
      await connection && connection.close()
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

async function Queue(connection, options = {}) {
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
    name: queue.queue, close, bind, consume, cancel
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

  async function close() {
    await channel.close()
  }

  async function bind(exchange, pattern) {
    if (exchange === '') return;  // can't bind to the default exchange
    await channel.bindQueue(instance.name, exchange, pattern)
  }

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

  async function cancel(event, listener) {
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
      console.log('sending', buffer.toString(), 'to', replyQueue, 'with correlation', correlation)
      const drained = channel.sendToQueue(replyQueue, buffer, correlation)
      if (drained) setImmediate(() => instance.emit('drain'))
    }
  }
}

const EXCHANGE_DEFAULTS = {
  name: '',
  type: 'direct',
  replyTo: 'replyTo',
  correlationId: 'correlationId',
  mode: 'immediate',  // immediate | confirm | reply
}

function isBuiltIn(name, type) {
  return (name === '' || BUILT_IN_EXCHANGES[type] === name)
}

function createChannel(connection, config) {
  return config.confirm
    ? connection.createConfirmChannel()
    : connection.createChannel()
}

function createReplyQueue(channel, config) {
  return config.reply
    ? channel.assertQueue('', { exclusive: true })
    : undefined
}

async function Exchange(connection, options) {
  const config = Object.assign({}, EXCHANGE_DEFAULTS, options)
  const publishModes = {
    immediate: publishImmediate,
    confirm: publishConfirm,
    reply: publishReply
  }
  const publish = publishModes[config.mode]
  if (!publish) throw new Error(`No publish method for mode '${config.mode}'`)

  const channel = await createChannel(connection, config)
  const replyQueue = await createReplyQueue(channel, config)
  const replies = new EventEmitter()
  const instance = Object.assign(new EventEmitter(), {
    publish,
    close,
    queue,
    config
  })

  if (replyQueue) channel.consume(replyQueue, onReply)
  if (!isBuiltIn()) await channel.assertExchange(config.name, config.type, config)
  instance.emit('connect')
  connection.on('close', () => instance.emit('disconnect'))
  channel.on('close', () => instance.emit('close', instance))
  channel.on('drain', () => instance.emit('drain'))

  return instance

  async function publishImmediate(content, key, opts) {
    const buffer = Buffer.from(String(content))
    if (channel.publish(config.name, key, buffer, opts)) {
      setImmediate(() => instance.emit('drain'))
    }
    return Promise.resolve()
  }

  async function publishConfirm(content, key, opts) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(String(content))
      if (channel.publish(config.name, key, buffer, opts, onConfirm)) {
        instance.emit('drain')
      }
      function onConfirm (err, ok) {
        err ? reject(err) : resolve()
      }
    })
  }

  async function publishReply(content, key, opts) {
    const buffer = Buffer.from(String(content))
    const publishedId = uuid.v4()
    const replyOptions = Object.assign(opts, {
      [config.correlationId]: publishedId,
      [config.replyTo]: replyQueue
    })
    if (channel.publish(config.name, key, buffer, replyOptions)) {
      setImmediate(() => instance.emit('drain'))
    }
    return new Promise((resolve, reject) => {
      replies.on('message', checkReply)
      function checkReply(content, id) {
        if (id !== publishedId) return
        replies.removeListener('message', checkReply)
        resolve(content)
      }
    })
  }

  function onReply(msg) {
    const content = msg.content.toString()
    replies.emit('message', content, msg.properties[correlationId])
    channel.ack(msg)
  }

  async function close() {
    await channel.close()
  }

  async function queue(options = {}) {
    const newQueue = await Queue(connection, options)
    const keys = options.keys || ['']
    const bindings = keys.map(key => newQueue.bind(config.name, key))
    await Promise.all(bindings)
    instance.emit('queue', newQueue)
    return newQueue
  }
}
