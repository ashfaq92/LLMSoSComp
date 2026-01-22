import { startDevice } from './deviceHelper.js'

const td = {
  title: 'SmartAssistant',
  description: 'A smart assistant that can say phrases',
  actions: {
    say: {
      title: 'Say phrase',
      description: 'Makes the assistant say the given phrase',
      input: {
        type: 'object',
        properties: {
          phrase: { type: 'string', description: 'The phrase to be spoken' }
        }
      }
    }
  }
}

const handlers = {
  setActionHandler: {
    say: async (input) => {
      const { phrase } = await input.value()
      console.log(`🗣️ Assistant says: "${phrase}"`)
      return { said: phrase }
    }
  }
}

startDevice({ td, handlers })