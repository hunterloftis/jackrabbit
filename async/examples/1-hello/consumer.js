const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  const queue = await jackrabbit(RABBIT_URL).queue({ name: 'hello' })

  queue.on('message', async (data) => {
    console.log('received', data)
  })
}
