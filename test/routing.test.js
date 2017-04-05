// Corresponds to Tutorial 4
// https://www.rabbitmq.com/tutorials/tutorial-four-javascript.html

const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: routing', () => {
  const NAME = 'routing-integration'
  let queue
  let received = []

  it(`consumes from a queue bound to the ${NAME} exchange with keys [warning, error]`, async () => {
    const exchange = await jackrabbit(RABBIT_URL).exchange({ name: NAME, durable: false })
    queue = await exchange.queue({ exclusive: true, keys: ['warning', 'error'], ack: false })
    queue.consume(contents => received.push(contents))
  })

  it(`publishes to [info, warning, error] on the ${NAME} exchange`, async () => {
    const exchange = await jackrabbit(RABBIT_URL).exchange({ name: NAME, durable: false })
    exchange.publish('foo', 'info')
    exchange.publish('bar', 'warning')
    exchange.publish('baz', 'error')
    exchange.once('drain', exchange.close);
  })

  it(`receives the warning and error messages`, async function () {
    this.retries(1000)
    assert.deepEqual(received, ['bar', 'baz'])
    await queue.close()
  })
})
