const jackrabbit = require('..')
const pevent = require('promisify-event')
const RABBIT_URL = process.env.RABBIT_URL

main()

async function main() {
  const queue = await jackrabbit(RABBIT_URL).queue({ name: 'hello', ack: false })

  queue.consume(async (data) => {
    console.log('received', data)
    setImmediate(async () => {
      await queue.close()
      console.log('closed listening queue')
    })
  })

  const exchange = await jackrabbit(RABBIT_URL).exchange()

  exchange.publish('Hello, world', 'hello')
  exchange.once('drain', exchange.close)
}
