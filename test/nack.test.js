const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: nack', () => {
  describe('with requeue: 0', () => {
    const NAME='nack-integration-0'
    let attempts = []
    let queue

    it(`consumes the ${NAME} queue, acking evens and nacking odds`, async () => {
      queue = await jackrabbit(RABBIT_URL).queue({ name: NAME, requeue: 0 })
      queue.consume(async data => {
        const n = Number(data)
        attempts.push(n)
        await promiseEven(n)
      })
    })

    it(`publishes ascending integers to ${NAME}`, async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      for (var i = 0; i < 5; i++) exchange.publish(i, NAME)
      exchange.once('drain', exchange.close)
    })

    it('receives each integer once', async function () {
      this.retries(1000)
      assert.deepEqual(attempts, [0, 1, 2, 3, 4])
      await queue.close()
    })
  })
  describe('with requeue: 1', () => {
    const NAME='nack-integration-1'
    let attempts = []
    let queue

    it(`consumes the ${NAME} queue, acking evens and nacking odds`, async () => {
      queue = await jackrabbit(RABBIT_URL).queue({ name: NAME, requeue: 1 })
      queue.consume(async data => {
        const n = Number(data)
        attempts.push(n)
        await promiseEven(n)
      })
    })

    it(`publishes ascending integers to ${NAME}`, async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      for (var i = 0; i < 5; i++) exchange.publish(i, NAME)
      exchange.once('drain', exchange.close)
    })

    it('receives odd integers twice', async function () {
      this.retries(1000)
      assert.deepEqual(attempts, [0, 1, 2, 3, 4, 1, 3])
      await queue.close()
    })
  })
  describe('with requeue: 2', () => {
    const NAME='nack-integration-2'
    let attempts = []
    let queue

    it(`consumes the ${NAME} queue, nacking everything`, async () => {
      queue = await jackrabbit(RABBIT_URL).queue({ name: NAME, requeue: 2 })
      queue.consume(async data => {
        attempts.push(data)
        throw new Error('always throws')
      })
    })

    it(`publishes "hello" to ${NAME}`, async () => {
      const exchange = await jackrabbit(RABBIT_URL).exchange()
      exchange.publish('hello', NAME)
      exchange.once('drain', exchange.close)
    })

    it('receives "hello" many times', async function () {
      this.retries(1000)
      assert(attempts.length > 10)
      await queue.close()
    })
  })
})

async function promiseEven(n) {
  return new Promise((resolve, reject) => {
    if (n % 2 !== 0) return reject(new Error('odd number'))
    resolve(n)
  })
}
