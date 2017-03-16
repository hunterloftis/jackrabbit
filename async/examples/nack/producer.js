const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const exchange = await jackrabbit(RABBIT_URL).exchange()

  exchange.publish('Hello, world', 'hello')
  exchange.once('drain', exchange.close)
}
