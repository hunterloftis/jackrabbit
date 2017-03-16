const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const exchange = await jackrabbit(RABBIT_URL).fanout({ name: 'logs', durable: false })

  exchange.publish('this is a log')
  exchange.once('drain', exchange.close)
}
