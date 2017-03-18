const jackrabbit = require('..')
const pevent = require('promisify-event')
const RABBIT_URL = process.env.CLOUDAMQP_URL

console.log = () => {}

describe('broker', () => {
  const url = 'amqp://localhost/foo'
  const broker = jackrabbit(url)
  it('accepts a url', () => {
    expect(broker.url).toBe(url)
  })
  it('starts without a connection', () => {
    expect(broker.connection).toBeUndefined()
  })
  it('exposes queue, exchange, fanout, topic', () => {
    expect(broker).toHaveProperty('queue')
    expect(broker).toHaveProperty('exchange')
    expect(broker).toHaveProperty('fanout')
    expect(broker).toHaveProperty('topic')
  })
})

describe('.exchange', () => {
  describe('constructor', () => {
    const broker = jackrabbit(RABBIT_URL)
    let exchange
    it('automatically connects the broker', async () => {
      expect(broker.connection).toBeUndefined()
      exchange = await broker.exchange()
      expect(broker.connection).not.toBeUndefined()
    })
    it('automatically closes the broker connection', async () => {
      await exchange.close()
      await pevent(exchange, 'disconnect')
      expect(broker.connection).toBeUndefined()
    })
    it('throws an error if a connection cannot be established', async() => {
      expect.assertions(1)
      try {
        await jackrabbit('amqp://foo').exchange()
      }
      catch (err) {
        expect(err.message).toMatch(/ENOTFOUND/)
      }
    })
    it('exposes publish, close, and queue', async () => {
      let exchange = await broker.exchange()
      expect(exchange).toHaveProperty('publish')
      expect(exchange).toHaveProperty('close')
      expect(exchange).toHaveProperty('queue')
    })
  })
})
