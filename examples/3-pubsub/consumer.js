const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const exchange = await jackrabbit(RABBIT_URL).fanout({ name: 'logs', durable: false })
  const queue = await exchange.queue({ exclusive: true, ack: false })

  queue.consume(data => console.log('log:', data))
}
