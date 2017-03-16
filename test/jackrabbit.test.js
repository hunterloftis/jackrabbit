const jackrabbit = require('..')
const RABBIT_URL = process.env.CLOUDAMQP_URL

describe('jackrabbit', () => {
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
})
