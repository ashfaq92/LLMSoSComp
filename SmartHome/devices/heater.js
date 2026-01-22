import { startDevice } from './deviceHelper.js'

const td = {
  title: 'Heater',
  description: 'A smart heater',
  actions: {
    startHeater: {
      title: 'Start heater',
      description: 'Starts the heater at the given temperature for the given time',
      input: {
        type: 'object',
        properties: {
          temperature: { type: 'integer', description: 'Temperature in °C' },
          timeHeating: { type: 'integer', description: 'Minutes to heat' }
        }
      }
    }
  }
}

let state = { temperature: 20, heating: false }

const handlers = {
  setActionHandler: {
    startHeater: async (input) => {
      const { temperature, timeHeating } = await input.value()
      state.temperature = temperature
      state.heating = true
      console.log(`🔥 Heater started at ${temperature}°C for ${timeHeating} min`)
      setTimeout(() => {
        state.heating = false
        console.log('🔥 Heater stopped')
      }, (timeHeating || 1) * 60000)
      return { status: 'started', temperature, timeHeating }
    }
  }
}

startDevice({ td, handlers })