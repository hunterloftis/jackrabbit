// simple producer
const jackrabbit = require('jackrabbit')
const exchange = await jackrabbit(RABBIT_URL).exchange()

exchange.publish('Hello, world', { key: 'hello' })
exchange.once('drain', exchange.close)

// simple consumer
const jackrabbit = require('jackrabbit')
const queue = await jackrabbit(RABBIT_URL).queue({ name: 'hello' })

queue.on('message', async (data) => {
  console.log('received', data)
})



// work queue publisher
const jackrabbit = require('jackrabbit')
const exchange = await jackrabbit(RABBIT_URL).exchange()

exchange.publish({ name: 'Hunter' }, { key: 'tasks', persistent: true }))
exchange.once('drain', exchange.close)

// work queue subscriber
const jackrabbit = require('jackrabbit')
const queue = await jackrabbit(RABBIT_URL).queue({ name: 'tasks', durable: true })

queue.on('message', async (data) => {
  console.log(`Hello, ${ data.name }!`)
  // auto-acks if a non-Promise is returned. if a Promise is returned, acks when the promise resolves
})



// pubsub publisher
const jackrabbit = require('jackrabbit')
const exchange = await jackrabbit(RABBIT_URL).fanout().exchange() // how does the built-in fanout exchange thing work again?

exchange.publish('this is a log')
exchange.once('drain', exchange.close)

// pubsub consumer
const jackrabbit = require('jackrabbit')
const queue = await jackrabbit(RABBIT_URL).fanout().queue({ exclusive: true })

queue.on('message', async (data) => {
  console.log(`Received log: ${data}`)
})



// routing publisher
const jackrabbit = require('jackrabbit')
const exchange = await jackrabbit(RABBIT_URL).direct('logs')

exchange.publish({ text: 'this is a harmless log' }, { key: 'info' })
exchange.publish({ text: 'this one is more important' }, { key: 'warning' })
exchange.publish({ text: 'pay attention to me!' }, { key: 'error' })
exchange.once('drain', exchange.close)

// routing consumer
const jackrabbit = require('jackrabbit')
const exchange = await jackrabbit(RABBIT_URL).direct('logs')
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
const exchange = await jackrabbit(RABBIT_URL).topic('animals').exchange()

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
const broker = jackrabbit(RABBIT_URL)
const first = await broker.topic('animals').queue({ exclusive: true, key: '*.orange.*' })
const second = await broker.topic('animals').queue({ exclusive: true, keys: [ '*.*.rabbit', 'lazy.#' ] })

first.on('message', console.log)
second.on('message', console.log)



// RPC client
const jackrabbit = require('jackrabbit')
const queue = await jackrabbit(RABBIT_URL).queue({ name: 'rpc', prefetch: 1, reply: true })
const response = await queue.publish({ n: 40 }, { key: 'rpc' })
console.log(`result: ${response}`)
queue.close()

// RPC server (TODO: check out the "micro" framework to see what their API is like)
const jackrabbit = require('jackrabbit')
const queue = await jackrabbit(RABBIT_URL).queue({ name: 'rpc', prefetch: 1, reply: true })

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
const exchange = await jackrabbit(RABBIT_URL).exchange({ confirm: true }) // uses the default() exchange
const sent = await exchange.publish('Hello, world', { key: 'hello' })   // non-confirm channels also return a Promise, they just resolve immediately
console.log(`message sent: ${sent}`)
exchange.once('drain', exchange.close)

// simple consumer with confirm channel
const jackrabbit = require('jackrabbit')

const exchange = await jackrabbit(process.env.RABBIT_URL).exchange({ confirm: true })
const queue = await exchange.queue({ name: 'hello', ack: false })

queue.on('message', async (data) => {
  console.log('received', data)
})



// simple producer with nack and options
const jackrabbit = require('jackrabbit')
const exchange = await jackrabbit(RABBIT_URL).exchange()
await exchange.queue({ name: 'hello', ack: true })

const response = await exchange.publish('Hello, world', { key: 'hello' })
console.log(`acknowledged: ${response}`)
exchange.once('drain', exchange.close)

// simple consumer with nack and options
const jackrabbit = require('jackrabbit')
const queue = await jackrabbit(RABBIT_URL).queue({ name: 'hello', ack: true })

queue.on('message', async (data, msg) => {
  console.log('received', data)
  throw jackrabbit.nack({ allUpTo: false, requeue: false })
})



// get queue length, number of consumers
const jackrabbit = require('jackrabbit')
const broker = jackrabbit(RABBIT_URL)
const { length, consumers } = await broker.queue({ name: 'hello' }).info()



// consumer with N retry attempts
// (lib manually ack()s && requeues on failure while decrementing header value like x-retry-count, which starts at N)
const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const queue = await jackrabbit(RABBIT_URL).queue({ name: 'hello', retry: 3 })

  queue.consume(async (data) => {
    console.log('processing', data)
    const success = await randomlyFail(data)
    if (success) setImmediate(queue.close)
  })
}

async function randomlyFail(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        console.log('=> succeeding')
        return resolve(true)
      }
      console.log('=> failing')
      reject(new Error('failed'))
    }, 100)
  })
}
