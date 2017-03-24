const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

// console.log = () => {}

describe('broker', () => {
  const url = 'amqp://localhost/foo'
  const broker = jackrabbit(url)
  it('accepts a url', () => {
    assert.equal(broker.url, url)
  })
  it('starts without a connection', () => {
    assert.isUndefined(broker.connection)
  })
  it('exposes queue, exchange, fanout, topic', () => {
    assert.property(broker, 'queue')
    assert.property(broker, 'exchange')
    assert.property(broker, 'fanout')
    assert.property(broker, 'topic')
  })
})

describe('.exchange', () => {
  describe('constructor', () => {
    const broker = jackrabbit(RABBIT_URL)
    let exchange
    it('automatically connects the broker', async () => {
      assert.isUndefined(broker.connection)
      exchange = await broker.exchange()
      assert.isDefined(broker.connection)
    })
    it('automatically closes the broker connection', async () => {
      await exchange.close()
      await pevent(exchange, 'disconnect')
      assert.isUndefined(broker.connection)
    })
    it('throws an error if a connection cannot be established', async() => {
      try {
        await jackrabbit('amqp://foo').exchange()
        throw new Error('should fail')
      }
      catch (err) {
        assert.match(err.message, /ENOTFOUND/)
      }
    })
    it('exposes publish, close, queue, and config', async () => {
      let exchange = await broker.exchange()
      assert.property(exchange, 'publish')
      assert.property(exchange, 'close')
      assert.property(exchange, 'queue')
      assert.property(exchange, 'config')
      await exchange.close()
    })
    it("uses the default exchange ('') by default", async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      assert.equal(exchange.config.name, '')
      await exchange.close()
    })
    it('can create a named exchange', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange({ name: 'foobar' })
      assert.equal(exchange.config.name, 'foobar')
      await exchange.close()
    })
    it('uses immediate mode by default', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      assert.equal(exchange.config.mode, 'immediate')
      await exchange.close()
    })
    it('can use confirm mode', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange({ mode: 'confirm' })
      assert.equal(exchange.config.mode, 'confirm')
      await exchange.close()
    })
    it('can use reply mode', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange({ mode: 'reply' })
      assert.equal(exchange.config.mode, 'reply')
      await exchange.close()
    })
    it('throws an error if a non-supported mode is used', async () => {
      try {
        const exchange = await jackrabbit(RABBIT_URL).exchange({ mode: 'foobar' })
        throw new Error('should fail')
      }
      catch (err) {
        assert.match(err.message, /No publish method for mode/)
      }
    })
  })
  describe('.publish', async () => {
    it('returns a Promise and drains', async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      const response = await exchange.publish('Hello, world', 'hello')
      assert.isUndefined(response)
      await pevent(exchange, 'drain')
      await exchange.close()
    })
  })
  describe('.queue', async () => {
    const exchange = await jackrabbit(RABBIT_URL).exchange()
    const queue = await exchange.queue()
    it('returns a Promise which resolves to a Queue', async () => {
      assert.property(queue, 'consume')
    })
    it('disconnects if the exchange closes', async () => {
      await exchange.close()
      await pevent(queue, 'close')
    })
  })
})
