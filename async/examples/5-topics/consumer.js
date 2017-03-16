const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const exchange = await jackrabbit(RABBIT_URL).topic({ name: 'animals', durable: false })
  const first = await exchange.queue({ exclusive: true, keys: ['*.orange.*'], ack: false })
  const second = await exchange.queue({ exclusive: true, keys: ['*.*.rabbit', 'lazy.#'], ack: false })

  first.consume(contents => console.log('first:', contents))
  second.consume(contents => console.log('second:', contents))
}
