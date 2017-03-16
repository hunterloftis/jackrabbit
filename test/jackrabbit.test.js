const jackrabbit = require('..')
const pevent = require('promisify-event')
const RABBIT_URL = process.env.CLOUDAMQP_URL

console.log = () => {}

describe('jackrabbit', () => {
  describe('broker', () => {
    describe('constructor', () => {
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
    })
  })
})
