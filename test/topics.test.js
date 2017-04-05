const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: topics', () => {
  const NAME = 'topics-integration'
  let first, second
  let received1 = []
  let received2 = []

  it(`consumes from two queues bound to the ${NAME} topic exchange`, async () => {
    const exchange = await jackrabbit(RABBIT_URL).topic({ name: NAME, durable: false })
    first = await exchange.queue({ exclusive: true, keys: ['*.orange.*'], ack: false })
    second = await exchange.queue({ exclusive: true, keys: ['*.*.rabbit', 'lazy.#'], ack: false })
    first.consume(contents => received1.push(contents))
    second.consume(contents => received2.push(contents))
  })

  it(`publishes to various keys on ${NAME}`, async () => {
    const exchange = await jackrabbit(RABBIT_URL).topic({ name: NAME, durable: false })
    exchange.publish('both a', 'quick.orange.rabbit')
    exchange.publish('both b', 'lazy.orange.elephant')
    exchange.publish('first a', 'quick.orange.fox')
    exchange.publish('second a', 'lazy.brown.fox')
    exchange.publish('second b', 'lazy.pink.rabbit')
    exchange.publish('discarded', 'quick.brown.fox')
    exchange.publish('discarded', 'orange')
    exchange.publish('second c', 'lazy.orange.male.rabbit')
    exchange.once('drain', exchange.close);
  })

  it(`receives routed topical messages`, async function () {
    this.retries(1000)
    assert.deepEqual(received1, ['both a', 'both b', 'first a'])
    assert.deepEqual(received2, ['both a', 'both b', 'second a', 'second b', 'second c'])
    await Promise.all([ first.close(), second.close() ])
  })
})
