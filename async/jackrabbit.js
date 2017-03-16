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

  return { exchange, queue }

  async function exchange(name = '', type = 'direct', options) {
    connection = connection || await amqp.connect(url)
    const newExchange = await Exchange(connection, name, type, options)
    actives.add(newExchange)
    newExchange.once('close', removeActive)
    return newExchange
  }

  async function queue(options) {
    connection = connection || await amqp.connect(url)
    const newQueue = await Queue(connection, options)
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

async function Queue(connection, opts) {
  const options = Object.assign({ noAck: !opts.ack }, opts)
  const instance = Object.assign(new EventEmitter(), { close })
  const channel = await connection.createChannel()
  const queue = await channel.assertQueue(options.name, options)
  const name = queue.queue
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
    consumerTag = await channel.consume(name, onMessage, options)
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
  const instance = Object.assign(new EventEmitter(), { publish, close })
  const channel = await connection.createChannel()
  const isDefault = (name === '' || DEFAULT_EXCHANGES[type] === name)

  if (!isDefault) await channel.assertExchange(name, type, options)
  instance.emit('connect')
  connection.on('close', () => instance.emit('disconnect'))
  channel.on('close', () => instance.emit('close', instance))
  channel.on('drain', () => instance.emit('drain'))
  return instance

  async function publish(key, content, options) {
    console.log('Publishing', content)
    if (channel.publish(name, key, new Buffer(content), options)) {
      setImmediate(() => instance.emit('drain'))
    }
  }

  async function close() {
    console.log('closing')
    await channel.close()
  }
}
