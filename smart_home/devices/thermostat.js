import { startDevice } from './deviceHelper.js'

const td = {
  title: 'Smart Thermostat',
  description: 'A smart thermostat that controls temperature, humidity, and heating/cooling modes',
  properties: {
    temperature: {
      type: 'number',
      title: 'Current Temperature',
      description: 'Current room temperature in Celsius',
      readOnly: true,
      minimum: -50,
      maximum: 50
    },
    targetTemperature: {
      type: 'number',
      title: 'Target Temperature',
      description: 'Target temperature in Celsius',
      readOnly: false,
      minimum: 10,
      maximum: 30
    },
    mode: {
      type: 'string',
      title: 'Operation Mode',
      description: 'Current operation mode (off, heat, cool, auto)',
      readOnly: false,
      enum: ['off', 'heat', 'cool', 'auto']
    },
    humidity: {
      type: 'integer',
      title: 'Humidity',
      description: 'Current humidity level percentage',
      readOnly: true,
      minimum: 0,
      maximum: 100
    }
  },
  actions: {
    setSchedule: {
      title: 'Set Schedule',
      description: 'Set a temperature schedule for a specific time',
      input: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description: 'Time in HH:MM format'
          },
          temperature: {
            type: 'number',
            description: 'Target temperature for this time'
          }
        },
        required: ['time', 'temperature']
      }
    }
  }
}

let state = {
  temperature: 22.5,
  targetTemperature: 21.0,
  mode: 'auto',
  humidity: 45
}

const handlers = {
  setPropertyReadHandler: {
    temperature: async () => {
      console.log(`🌡️  Reading current temperature: ${state.temperature}°C`)
      return state.temperature
    },
    targetTemperature: async () => {
      console.log(`🌡️  Reading target temperature: ${state.targetTemperature}°C`)
      return state.targetTemperature
    },
    mode: async () => {
      console.log(`🌡️  Reading mode: ${state.mode}`)
      return state.mode
    },
    humidity: async () => {
      console.log(`💧 Reading humidity: ${state.humidity}%`)
      return state.humidity
    }
  },
  setPropertyWriteHandler: {
    targetTemperature: async (input) => {
      const value = await input.value()
      const oldTarget = state.targetTemperature
      state.targetTemperature = Math.max(10, Math.min(30, value))
      console.log(`🌡️  Target temperature set from ${oldTarget}°C to ${state.targetTemperature}°C`)
      console.log(`    Current temp: ${state.temperature}°C (will adjust toward target)`)
    },
    mode: async (input) => {
      const value = await input.value()
      const validModes = ['off', 'heat', 'cool', 'auto']
      if (validModes.includes(value)) {
        state.mode = value
        console.log(`🌡️  Mode set to ${state.mode}`)
      } else {
        throw new Error('Invalid mode')
      }
    }
  },
  setActionHandler: {
    setSchedule: async (input) => {
      const inputData = await input.value()
      const { time, temperature } = inputData || {}
      if (!time || temperature === undefined) throw new Error('time and temperature required')
      console.log(`🌡️  Schedule set: ${time} -> ${temperature}°C`)
      return { status: 'scheduled', time, temperature }
    }
  }
}

startDevice({
  td,
  handlers,
  onExposed: () => {
    setInterval(() => {
      if (state.mode !== 'off') {
        const diff = state.targetTemperature - state.temperature
        state.temperature += diff * 0.3
        state.temperature = Math.round(state.temperature * 10) / 10
      }
      state.humidity = Math.max(30, Math.min(70, state.humidity + (Math.random() - 0.5) * 2))
      state.humidity = Math.round(state.humidity)
    }, 2000)
  }
})