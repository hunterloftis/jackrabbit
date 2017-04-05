const jackrabbit = require('..')
const assert = require('chai').assert
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

describe('integration: confirm', () => {

  // TODO: a better way of testing that a channel is in confirmation mode
  it('returns a Promise on publish', async () => {
    const exchange = await jackrabbit(RABBIT_URL).exchange({ confirm: true })
    await exchange.publish('Hello, world', 'hello')
    exchange.close()
  })

})
