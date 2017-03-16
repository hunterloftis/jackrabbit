const jackrabbit = require('../..')
const queue = await jackrabbit(process.env.RABBIT_URL).queue({ name: 'hello' })

queue.on('message', async (data) => {
  console.log('received', data)
})
