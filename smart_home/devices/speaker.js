import { startDevice } from './deviceHelper.js'

const td = {
  title: 'Speaker',
  description: 'A smart speaker',
  actions: {
    setVolume: {
      title: 'Set volume',
      description: 'Sets the volume of this speaker',
      input: {
        type: 'object',
        properties: {
          percentage: { type: 'integer', description: 'Volume percentage' }
        }
      }
    },
    getVolume: {
      title: 'Get volume',
      description: 'Gets the volume of this speaker',
      output: { type: 'integer' }
    }
  }
}

let state = { volume: 50 }

const handlers = {
  setActionHandler: {
    setVolume: async (input) => {
      const { percentage } = await input.value()
      state.volume = Math.max(0, Math.min(100, percentage))
      console.log(`🔊 Speaker volume set to ${state.volume}%`)
      return { volume: state.volume }
    },
    getVolume: async () => {
      console.log(`🔊 Speaker volume is ${state.volume}%`)
      return state.volume
    }
  }
}

startDevice({ td, handlers })