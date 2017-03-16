const amqp = require('amqplib')
const EventEmitter = require('events').EventEmitter

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
    fanout: builtIn('fanout')
  }

  function builtIn(type) {
    return async function (options) {
      return exchange(options.name || DEFAULT_EXCHANGES[type], type, options)
    }
  }

  async function exchange(name = '', type = 'direct', options) {
    connection = connection || await amqp.connect(url)
    const newExchange = await Exchange(connection, name, type, options)
    return registerExchange(newExchange)
  }

  async function queue(options) {
    connection = connection || await amqp.connect(url)
    const newQueue = await Queue(connection, options)
    return registerQueue(newQueue)
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

async function Queue(connection, options) {
  const noAck = options.ack !== undefined ? !options.ack : true
  const channel = await connection.createChannel()
  const queue = await channel.assertQueue(options.name, options)
  const instance = Object.assign(new EventEmitter(), { close, name: queue.queue })
  let consumerTag

  instance
    .on('newListener', consume)
    .on('removeListener', cancel)
    .emit('connect')
  connection
    .on('close', () => instance.emit('disconnect'))
  channel
    .on('close', () => instance.emit('close', instance))
    .on('drain', () => instance.emit('drain'))

  return instance

  async function close() {
    await channel.close()
  }

  async function consume(event, listener) {
    if (event !== 'message') return
    if (consumerTag) return
    consumerTag = await channel.consume(instance.name, onMessage, { noAck })
  }

  async function cancel(event, listener) {
    if (event !== 'message') return
    if (!consumerTag) return
    if (emitter.listenerCount('message') > 0) return
    await channel.cancel(consumerTag)
    consumerTag = undefined
  }

  function onMessage(msg) {
    instance.emit('message', msg.content.toString(), msg)
  }
}

async function Exchange(connection, name, type, options) {
  const instance = Object.assign(new EventEmitter(), { publish, close, queue })
  const channel = await connection.createChannel()
  const isDefault = (name === '' || DEFAULT_EXCHANGES[type] === name)

  if (!isDefault) await channel.assertExchange(name, type, options)
  instance.emit('connect')
  connection.on('close', () => instance.emit('disconnect'))
  channel.on('close', () => instance.emit('close', instance))
  channel.on('drain', () => instance.emit('drain'))
  return instance

  async function publish(content, key, options) {
    console.log('Publishing', content)
    if (channel.publish(name, key, new Buffer(content), options)) {
      setImmediate(() => instance.emit('drain'))
    }
  }

  async function close() {
    console.log('closing')
    await channel.close()
  }

  async function queue(options) {
    const newQueue = await Queue(connection, options)
    await channel.bindQueue(newQueue.name, name, options.bind)
    instance.emit('queue', newQueue)
    return newQueue
  }
}
