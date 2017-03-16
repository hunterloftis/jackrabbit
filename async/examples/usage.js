// https://speakerdeck.com/old_sound/messaging-patterns-with-rabbitmq

// features to add:
// X - confirmChannel (https://github.com/hunterloftis/jackrabbit/issues/23)
// X - reply: false (https://github.com/hunterloftis/jackrabbit/pull/57) (false by default, set reply: true to create a reply channel)
// X - nack with options: (https://github.com/hunterloftis/jackrabbit/pull/47)
// X - ack: non-promise return value, Promise.resolve(), nack: Promise.reject()
// X - maybe .publish() should return a Promise that resolve when the publishing happens? (https://github.com/hunterloftis/jackrabbit/issues/52)
// X - get size of queue? (https://github.com/hunterloftis/jackrabbit/issues/41)

// simple producer
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'hello' })

exchange.publish('Hello, world', { key: 'hello' })
exchange.once('drain', exchange.close)

// simple consumer
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'hello', ack: false })

queue.on('message', async (data) => {
  console.log('received', data)
})


// work queue publisher
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'task_queue', durable: true })

exchange.publish({ name: 'Hunter' }, { key: 'task_queue', persistent: true }))
exchange.once('drain', exchange.close)

// work queue subscriber
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'task_queue', durable: true })

queue.on('message', async (data) => {
  console.log(`Hello, ${ data.name }!`)
  // auto-acks if a non-Promise is returned. if a Promise is returned, acks when the promise resolves
})


// pubsub publisher
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.fanout()

exchange.publish('this is a log')
exchange.once('drain', exchange.close)

// pubsub consumer
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.fanout()
const queue = await exchange.queue({ exclusive: true })

queue.on('message', async (data) => {
  console.log(`Received log: ${data}`)
})


// routing publisher
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.direct('direct_logs')

exchange.publish({ text: 'this is a harmless log' }, { key: 'info' })
exchange.publish({ text: 'this one is more important' }, { key: 'warning' })
exchange.publish({ text: 'pay attention to me!' }, { key: 'error' })
exchange.once('drain', exchange.close)

// routing consumer
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.direct('direct_logs')
const errors = await exchange.queue({ exclusive: true, key: 'error' })
const logs = await exchange.queue({ exclusive: true, keys: ['info', 'warning'] })

errors.on('message', data => {
  console.log('writing to disk:', data.text)
})

logs.on('message', data => {
  console.log('writing to console:', data.text)
})


// topics publisher
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.topic('topic_animals')

exchange.publish({ text: 'both queues 1' }, { key: 'quick.orange.rabbit' })
exchange.publish({ text: 'both queues 2' }, { key: 'lazy.orange.elephant' })
exchange.publish({ text: 'first queue 1' }, { key: 'quick.orange.fox' })
exchange.publish({ text: 'second queue 1' }, { key: 'lazy.brown.fox' })
exchange.publish({ text: 'second queue 2' }, { key: 'lazy.pink.rabbit' })
exchange.publish({ text: 'discarded' }, { key: 'quick.brown.fox' })
exchange.publish({ text: 'discarded' }, { key: 'orange' })
exchange.publish({ text: 'second queue 3' }, { key: 'lazy.orange.male.rabbit' })
exchange.once('drain', exchange.close);

// topics consumer
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.topic('topic_animals')

const first = await exchange.queue({ exclusive: true, key: '*.orange.*' })
const second = await exchange.queue({ exclusive: true, keys: [ '*.*.rabbit', 'lazy.#' ] })

first.on('message', console.log)
second.on('message', console.log)


// RPC client
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'rpc', prefetch: 1, durable: false, reply: true })

const response = await exchange.publish({ n: 40 }, { key: 'rpc' })  // how does this interact with confirm channels below?
console.log(`result: ${response}`)
exchange.close()

// RPC server (TODO: check out the "micro" framework to see what their API is like)
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'rpc', prefetch: 1, durable: false, reply: true })

// should work with both sync functions (which return a value) and Promises, and should automatically ack/reply for both
queue.on('message', async (data) => {
  console.log(`request: ${data.n}`)
  return fib(data.n)
})

function fib(n) {
  if (n === 0) return 0
  if (n === 1) return 1
  return fib(n - 1) + fib(n - 2)
}



// simple producer with confirm channel
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default({ confirm: true })
const queue = await exchange.queue({ name: 'hello' })

const sent = await exchange.publish('Hello, world', { key: 'hello' })   // non-confirm channels also return a Promise, they just resolve immediately
console.log(`message sent: ${sent}`)
exchange.once('drain', exchange.close)

// simple consumer with confirm channel
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default({ confirm: true })
const queue = await exchange.queue({ name: 'hello', ack: false })

queue.on('message', async (data) => {
  console.log('received', data)
})



// simple producer with nack and options
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'hello', ack: true })

const response = await exchange.publish('Hello, world', { key: 'hello' })
console.log(`acknowledged: ${response}`)
exchange.once('drain', exchange.close)

// simple consumer with nack and options
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'hello', ack: true })

queue.on('message', async (data, nack, msg) => {
  console.log('received', data)
  throw nack({ allUpTo: false, requeue: false })
})


// get queue length, number of consumers
const jackrabbit = require('jackrabbit')

const broker = jackrabbit(process.env.RABBIT_URL)
const exchange = await broker.default()
const queue = await exchange.queue({ name: 'hello' })

const length = await queue.length()
const consumers = await queue.consumers()
