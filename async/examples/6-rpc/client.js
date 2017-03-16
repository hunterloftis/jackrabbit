const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const exchange = await jackrabbit(RABBIT_URL).exchange({ prefetch: 1, reply: true })
  const reply = await exchange.publish(9, 'rpc')
  console.log(`answer: ${reply}`)
  exchange.once('drain', exchange.close)
}
