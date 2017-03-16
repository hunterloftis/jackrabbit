const amqp = require('amqplib')
const EventEmitter = require('events').EventEmitter
const uuid = require('uuid')

const DEFAULT_EXCHANGES = {
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
    topic: builtIn('topic')
  }

  function builtIn(type) {
    return async function (options) {
      return exchange(options.name || DEFAULT_EXCHANGES[type], type, options)
    }
  }

  async function exchange(options) {
    connection = connection || await amqp.connect(url)
    const newExchange = await Exchange(connection, options)
    return registerExchange(newExchange)
  }

  async function queue(options) {
    connection = connection || await amqp.connect(url)
    const newQueue = await Queue(connection, options)
    return registerQueue(newQueue)
  }

  function nack(msg, options) {
    return Object.assign(new NackError(msg), options)
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

  async function removeActive(item) {
    if (!actives.delete(item)) {
      throw new Error('Tried to remove a nonexistant Exchange or Queue')
    }
    if (actives.size === 0) {
      await connection.close()
      connection = undefined
    }
  }
}

async function Queue(connection, options = {}) {
  const replyTo = options.replyTo === undefined ? 'replyTo' : options.replyTo
  const correlationId = options.correlationId === undefined ? 'correlationId' : options.correlationId
  const noAck = options.ack === undefined ? true : !options.ack
  const rethrow = options.rethrow
  const requeue = options.requeue === undefined ? true : options.requeue
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
         .on('drain', () => instance.emit('drain'))

  return instance

  async function close() {
    await channel.close()
  }

  async function bind(exchange, pattern) {
    await channel.bindQueue(instance.name, exchange, pattern)
  }

  async function consume(consumer) {
    if (consumerTag) {
      throw new Error('consume() called more than once')
    }
    console.log('starting consume channel')
    consumerTag = await channel.consume(instance.name, onMessage, { noAck })
    console.log('==> started')

    async function onMessage(msg) {
      try {
        const result = await Promise.resolve(consumer(msg.content.toString(), msg))
        console.log('result:', result)
        reply(msg, result)
        if (!noAck) channel.ack(msg, allUpTo)
      }
      catch (err) {
        if (!noAck) channel.nack(msg, allUpTo, requeue)
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
    else {
      throw new Error('Value returned from consumer but missing replyTo or correlationId')
    }
  }
}

async function Exchange(connection, options = {}) {
  const name = options.name || ''
  const type = options.type || 'direct'
  // TODO: use es2015 destructuring & default vals to make this less horrible
  const replyTo = options.replyTo === undefined ? 'replyTo' : options.replyTo
  const correlationId = options.correlation === undefined ? 'correlationId' : options.correlation
  const instance = Object.assign(new EventEmitter(), { publish, close, queue })
  const channel = await connection.createChannel()
  const isDefault = (name === '' || DEFAULT_EXCHANGES[type] === name)
  const replies = new EventEmitter()
  console.log('got here')
  const { queue: replyQueue } = options.reply
    ? await channel.assertQueue('', { exclusive: true })
    : { queue: undefined }

  console.log('got here')

  if (replyQueue) {
    console.log('listening for an answer on', replyQueue)
    channel.consume(replyQueue, (msg) => {
      const content = msg.content.toString()
      console.log('got reply', content, 'with id', msg.properties[correlationId])
      replies.emit('message', content, msg.properties[correlationId])
      channel.ack(msg)
    })
  }
  if (!isDefault) await channel.assertExchange(name, type, options)

  instance.emit('connect')
  connection.on('close', () => instance.emit('disconnect'))
  channel.on('close', () => instance.emit('close', instance))
  channel.on('drain', () => instance.emit('drain'))
  return instance

  async function publish(content, key, options) {
    console.log('Publishing', content)
    const publishedId = replyQueue && uuid.v4()
    const replyOptions = { [correlationId]: publishedId, [replyTo]: replyQueue }
    const buffer = Buffer.from(String(content))
    if (channel.publish(name, key, buffer, replyOptions)) {
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

  async function close() {
    console.log('closing')
    await channel.close()
  }

  async function queue(options) {
    const newQueue = await Queue(connection, options)
    const keys = options.keys || []
    const bindings = keys.map(key => newQueue.bind(name, key))
    await Promise.all(bindings)
    instance.emit('queue', newQueue)
    return newQueue
  }
}
