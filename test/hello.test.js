const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: hello', () => {
  const NAME = 'hello-integration'
  let received

  it(`consumes the "${NAME}" queue`, async () => {
    const queue = await jackrabbit(RABBIT_URL).queue({ name: NAME, ack: false })
    queue.consume(data => {
      received = data
      // it would be great if `await queue.close()` worked here,
      // but if we allowed that you could close an ack-required queue without acking
      setImmediate(queue.close)
    })
  })

  it(`publishes "Hello, world" to the "${NAME}" queue`, async () => {
    const exchange = await jackrabbit(RABBIT_URL).exchange()
    exchange.publish('Hello, world', NAME)
    exchange.once('drain', exchange.close)
    await pevent(exchange, 'close')
  })

  it('receives "Hello, world"', function () {
    this.retries(2)
    assert.equal(received, 'Hello, world')
  })
})
