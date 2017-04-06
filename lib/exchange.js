const EventEmitter = require('events').EventEmitter
const uuid = require('uuid')
const Queue = require('./queue')

const BUILT_IN_EXCHANGES = {
  'direct': 'amq.direct',
  'fanout': 'amq.fanout',
  'topic': 'amq.topic',
  'undefined': ''
}

const EXCHANGE_DEFAULTS = {
  name: '',
  type: 'direct',
  replyTo: 'replyTo',
  correlationId: 'correlationId',
  mode: 'immediate',  // immediate | confirm | reply
}

module.exports = async function Exchange(connection, options) {
  options.name = options.name || BUILT_IN_EXCHANGES[options.type] // TODO: less janky
  const config = Object.assign({}, EXCHANGE_DEFAULTS, options)
  const publishModes = {
    immediate: publishImmediate,
    confirm: publishConfirm,
    reply: publishReply
  }
  const publish = publishModes[config.mode]
  if (!publish) throw new Error(`No publish method for mode '${config.mode}'`)

  const channel = await createChannel(connection, config.mode)
  const replyQueue = await createReplyQueue(channel, config.mode)
  const consumeReply = replyQueue && (await channel.consume(replyQueue, onReply)).consumerTag
  const replies = new EventEmitter()
  const instance = Object.assign(new EventEmitter(), {
    publish,
    close,
    queue,
    config
  })

  if (!isBuiltIn(config.name, config.type)) {
    await channel.assertExchange(config.name, config.type, config)
  }
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

  async function publishReply(content, key, opts = {}) {
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
    replies.emit('message', content, msg.properties[config.correlationId])
    channel.ack(msg)
  }

  async function close() {
    if (consumeReply) await channel.cancel(consumeReply)
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

function isBuiltIn(name, type) {
  return (name === '' || BUILT_IN_EXCHANGES[type] === name)
}

function createChannel(connection, mode) {
  return mode === 'confirm'
    ? connection.createConfirmChannel()
    : connection.createChannel()
}

async function createReplyQueue(channel, mode) {
  if (mode !== 'reply') return undefined
  const replyQueue = await channel.assertQueue('', { exclusive: true })
  return replyQueue.queue
}
