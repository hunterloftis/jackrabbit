const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

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
        await jackrabbit('amqp://localhost:1234').exchange()
        throw new Error('should fail')
      }
      catch (err) {
        assert.match(err.message, /ECONNREFUSED/)
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
    const broker = jackrabbit(RABBIT_URL)
    const exchange = await broker.exchange()
    const queue = await exchange.queue()
    it('returns a Promise which resolves to a Queue', async () => {
      assert.property(queue, 'consume')
    })
    it('disconnects if the exchange closes', async () => {
      assert.isDefined(broker.connection)
      await exchange.close()
      await pevent(queue, 'close')
      assert.isUndefined(broker.connection)
    })
  })
})

describe('.queue', () => {
  describe('constructor', () => {
    const broker = jackrabbit(RABBIT_URL)
    let queue
    it('returns a Promise which resolves to a Queue', async () => {
      queue = await broker.queue({ name: 'hello' })
      assert.property(queue, 'consume')
    })
    it('disconnects if the queue closes', async () => {
      assert.isDefined(broker.connection)
      await queue.close()
      await pevent(queue, 'disconnect')
      assert.isUndefined(broker.connection)
    })
  })
})

describe('.fanout', () => {
  describe('constructor', () => {
    describe('without name', () => {
      const broker = jackrabbit(RABBIT_URL)
      let exchange
      it('uses the default amq.fanout exchange', async () => {
        exchange = await broker.fanout()
        assert.property(exchange, 'publish')
        assert.equal(exchange.config.name, 'amq.fanout')
        assert.equal(exchange.config.type, 'fanout')
        await exchange.close()
      })
    })
    describe('with name', () => {
      const broker = jackrabbit(RABBIT_URL)
      let exchange
      it('uses the default amq.fanout exchange', async () => {
        exchange = await broker.fanout({ name: 'my-fanout' })
        assert.property(exchange, 'publish')
        assert.equal(exchange.config.name, 'my-fanout')
        assert.equal(exchange.config.type, 'fanout')
        await exchange.close()
      })
    })
  })
})

describe('.topic', () => {
  describe('constructor', () => {
    describe('without name', () => {
      const broker = jackrabbit(RABBIT_URL)
      let exchange
      it('uses the default amq.topic exchange', async () => {
        exchange = await broker.topic()
        assert.property(exchange, 'publish')
        assert.equal(exchange.config.name, 'amq.topic')
        assert.equal(exchange.config.type, 'topic')
        await exchange.close()
      })
    })
    describe('with name', () => {
      const broker = jackrabbit(RABBIT_URL)
      let exchange
      it('uses the default amq.topic exchange', async () => {
        exchange = await broker.topic({ name: 'my-topic' })
        assert.property(exchange, 'publish')
        assert.equal(exchange.config.name, 'my-topic')
        assert.equal(exchange.config.type, 'topic')
        await exchange.close()
      })
    })
  })
})
