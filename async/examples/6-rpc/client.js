const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  try {
    const exchange = await jackrabbit(RABBIT_URL).exchange({ prefetch: 1, reply: true })

    console.log('request answer to 9...')
    const reply = await exchange.publish(9, 'rpc')
    console.log(`answer: ${reply}`)
    exchange.once('drain', exchange.close)
  }
  catch (e) {
    console.error(e.stack || e)
  }
}
