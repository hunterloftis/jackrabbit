const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const exchange = await jackrabbit(RABBIT_URL).topic({ name: 'animals', durable: false })

  exchange.publish('both queues a', 'quick.orange.rabbit')
  exchange.publish('both queues b', 'lazy.orange.elephant')
  exchange.publish('first queue a', 'quick.orange.fox')
  exchange.publish('second queue a', 'lazy.brown.fox')
  exchange.publish('second queue b', 'lazy.pink.rabbit')
  exchange.publish('discarded', 'quick.brown.fox')
  exchange.publish('discarded', 'orange')
  exchange.publish('second queue c', 'lazy.orange.male.rabbit')
  exchange.once('drain', exchange.close);
}
