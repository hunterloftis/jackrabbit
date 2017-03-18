const jackrabbit = require('..')
const pevent = require('promisify-event')
const RABBIT_URL = process.env.CLOUDAMQP_URL

// console.log = () => {}

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
    it('exposes publish, close, queue, and config', async () => {
      let exchange = await broker.exchange()
      expect(exchange).toHaveProperty('publish')
      expect(exchange).toHaveProperty('close')
      expect(exchange).toHaveProperty('queue')
      expect(exchange).toHaveProperty('config')
      await exchange.close()
    })
    it("uses the default exchange ('') by default", async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      expect(exchange.config.name).toBe('')
      await exchange.close()
    })
    it('can create a named exchange', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange({ name: 'foobar' })
      expect(exchange.config.name).toBe('foobar')
      await exchange.close()
    })
    it('uses immediate mode by default', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      expect(exchange.config.mode).toBe('immediate')
      await exchange.close()
    })
    it('can use confirm mode', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange({ mode: 'confirm' })
      expect(exchange.config.mode).toBe('confirm')
      await exchange.close()
    })
    it('can use reply mode', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange({ mode: 'reply' })
      expect(exchange.config.mode).toBe('reply')
      await exchange.close()
    })
    it('throws an error if a non-supported mode is used', async () => {
      expect.assertions(1)
      try {
        const exchange = await jackrabbit(RABBIT_URL).exchange({ mode: 'foobar' })
      }
      catch (err) {
        expect(err.message).toMatch(/No publish method for mode/)
      }
    })
  })
  describe('publish', async () => {


  })
})
