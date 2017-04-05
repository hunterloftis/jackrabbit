// Corresponds to Tutorial 2
// https://www.rabbitmq.com/tutorials/tutorial-two-javascript.html

const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: work', () => {
  const NAME = 'work-integration'
  let tasks1 = new Set()
  let tasks2 = new Set()
  let worker1, worker2

  it(`worker1 consumes the ${NAME} queue on the default exchange`, async () => {
    worker1 = await jackrabbit(RABBIT_URL).queue({ name: NAME, durable: true, prefetch: 1 })
    worker1.consume(data => tasks1.add(Number(data)))
  })

  it(`worker2 consumes the ${NAME} queue on the default exchange`, async () => {
    worker2 = await jackrabbit(RABBIT_URL).queue({ name: NAME, durable: true, prefetch: 1 })
    worker2.consume(data => tasks2.add(Number(data)))
  })

  it(`producer publishes 5 tasks keyed to ${NAME} on the default exchange`, async () => {
    const exchange = await jackrabbit(RABBIT_URL).exchange()
    for (var i = 0; i < 5; i++) exchange.publish(i, NAME, { persistent: true })
    exchange.once('drain', exchange.close)
  })

  it('each worker receives unique tasks', async function () {
    this.retries(1000)  // really crappy hack without a timeout, but mocha doesn't support retries & timeouts in the same test
    assert.equal(tasks1.size + tasks2.size, 5)
    let shared = new Set([...tasks1].filter(x => tasks2.has(x)))
    assert.equal(shared.size, 0)
    let tasks = new Set([...tasks1, ...tasks2])
    assert.deepEqual(Array.from(tasks).sort(), [0, 1, 2, 3, 4])
    await Promise.all([worker1.close(), worker2.close()])
  })
})
