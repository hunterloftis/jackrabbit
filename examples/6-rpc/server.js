const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const queue = await jackrabbit(RABBIT_URL).queue({ name: 'rpc', durable: false, ack: false })

  console.log('consuming...')
  queue.consume(async (n) => {
    console.log(`request: fib(${n})`)
    return fib(Number(n))
  })

  function fib(n) {
    if (n === 0) return 0
    if (n === 1) return 1
    return fib(n - 1) + fib(n - 2)
  }
}
