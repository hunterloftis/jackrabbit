const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: pubsub', () => {
  const NAME = 'pubsub-integration'
  let received1 = []
  let received2 = []
  let queue1, queue2

  it(`consumes fanout queues on the ${NAME} exchange`, async () => {
    const exchange1 = await jackrabbit(RABBIT_URL).fanout({ name: NAME, durable: false })
    queue1 = await exchange1.queue({ exclusive: true, ack: false })
    const exchange2 = await jackrabbit(RABBIT_URL).fanout({ name: NAME, durable: false })
    queue2 = await exchange2.queue({ exclusive: true, ack: false })

    queue1.consume(data => received1.push(data))
    queue2.consume(data => received2.push(data))
  })

  it(`publishes 3 items to the ${NAME} exchange`, async () => {
    const exchange = await jackrabbit(RABBIT_URL).fanout({ name: NAME, durable: false })

    for(var i = 0; i < 3; i++) exchange.publish(i)
    exchange.once('drain', exchange.close)

  })

  it('receives the items on all queues', async function () {
    this.retries(Infinity)  // really crappy hack without a timeout, but mocha doesn't support retries & timeouts in the same test
    assert.deepEqual(received1, ['0', '1', '2'], 'expected received1')
    assert.deepEqual(received2, ['0', '1', '2'], 'expected received2')
  })

  it('closes the queues', async () => {
    await Promise.all([queue1.close(), queue2.close()])
  })
})
