const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const exchange = await jackrabbit(RABBIT_URL).exchange({ confirm: true })
  await exchange.publish('Hello, world', 'hello')
  console.log('message confirmed')
  exchange.close()
}
