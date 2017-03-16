const jackrabbit = require('../../jackrabbit')
const RABBIT_URL = process.env.CLOUDAMQP_URL

main()

async function main() {
  try {
    const queue = await jackrabbit(RABBIT_URL).queue({ name: 'hello' })

    queue.consume(async (data) => {
      console.log('processing', data)
      const success = await randomlyFail(data)
      if (success) setImmediate(queue.close)
    })
  } catch (err) {
    console.error(err.stack || err)
  }
}

async function randomlyFail(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        console.log('=> succeeding')
        return resolve(true)
      }
      console.log('=> failing')
      reject(new Error('failed'))
    }, 100)
  })
}
