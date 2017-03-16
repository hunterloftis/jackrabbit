const amqp = require('amqplib')
const EventEmitter = require('events').EventEmitter

const DEFAULT_EXCHANGES = {
  'direct': 'amq.direct',
  'fanout': 'amq.fanout',
  'topic': 'amq.topic'
}

module.exports = (url) => {
  let connection
  const exchanges = new Set()

  return { exchange, queue }

  async function exchange(name = '', type = 'direct', options) {
    connection = connection || await amqp.connect(url)
    const newExchange = await Exchange(connection, name, type, options)
    exchanges.add(newExchange)
    newExchange.once('close', removeExchange)
    return newExchange
  }

  async function queue() {

  }

  async function removeExchange(oldExchange) {
    exchanges.delete(oldExchange)
    console.log('new exchange size:', exchanges.size)
    if (exchanges.size === 0) {
      await connection.close()
      connection = undefined
    }
  }
}

async function Exchange(connection, name, type, options) {
  const instance = Object.assign(new EventEmitter(), { publish, close })
  const channel = await connection.createChannel()
  const isDefault = (name === '' || DEFAULT_EXCHANGES[type] === name)

  if (!isDefault) await channel.assertExchange(name, type, options)
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
