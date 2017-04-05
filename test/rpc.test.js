const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: rpc', () => {
  const NAME = 'rpc-integration'

  it(`serves fib rpc on ${NAME}`, async () => {
    const queue = await jackrabbit(RABBIT_URL).queue({ name: NAME, durable: false, ack: false })
    queue.consume(n => {
      return fib(Number(n))
    })
  })

  it('calls fib(9) from a client to get 34', async () => {
    const exchange = await jackrabbit(RABBIT_URL).exchange({ prefetch: 1, mode: 'reply' })
    const reply = await exchange.publish(9, NAME)
    assert.equal(Number(reply), 34)
    exchange.once('drain', exchange.close)
  })
})

function fib(n) {
  if (n === 0) return 0
  if (n === 1) return 1
  return fib(n - 1) + fib(n - 2)
}
