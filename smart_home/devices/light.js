import { startDevice } from './deviceHelper.js'

const td = {
  title: 'Smart Light',
  description: 'A smart light that can be turned on/off and toggled',
  properties: {
    on: {
      type: 'boolean',
      title: 'On/Off State',
      description: 'Current state of the light (true = on, false = off)',
      readOnly: false,
      observable: false
    },
    brightness: {
      type: 'integer',
      title: 'Brightness',
      description: 'Brightness level (0-100)',
      minimum: 0,
      maximum: 100,
      readOnly: false
    }
  },
  actions: {
    toggle: {
      title: 'Toggle',
      description: 'Toggle the light on or off'
    },
    fadeIn: {
      title: 'Fade In',
      description: 'Gradually increase brightness',
      input: {
        type: 'object',
        properties: {
          duration: {
            type: 'integer',
            description: 'Duration in seconds',
            minimum: 1,
            maximum: 60
          }
        }
      }
    }
  }
}

let state = {
  on: false,
  brightness: 0
}

const handlers = {
  setPropertyReadHandler: {
    on: async () => {
      console.log(`💡 Reading light state: ${state.on ? 'ON' : 'OFF'}`)
      return state.on
    },
    brightness: async () => {
      console.log(`💡 Reading brightness: ${state.brightness}%`)
      return state.brightness
    }
  },
  setPropertyWriteHandler: {
    on: async (input) => {
      const value = await input.value()
      console.log(`💡 Write handler 'on' received value:`, value, `(type: ${typeof value})`)
      state.on = value
      console.log(`💡 Light turned ${state.on ? 'ON' : 'OFF'}`)
    },
    brightness: async (input) => {
      const value = await input.value()
      console.log(`💡 Write handler 'brightness' received value:`, value, `(type: ${typeof value})`)
      state.brightness = Math.max(0, Math.min(100, value))
      console.log(`💡 Brightness set to ${state.brightness}%`)
    }
  },
  setActionHandler: {
    toggle: async () => {
      state.on = !state.on
      console.log(`💡 Light toggled ${state.on ? 'ON' : 'OFF'}`)
      return { on: state.on }
    },
    fadeIn: async (input) => {
      const inputData = await input.value()
      const duration = inputData?.duration || 5
      console.log(`💡 Fading in over ${duration} seconds`)
      const steps = duration * 10
      const increment = (100 - state.brightness) / steps
      let currentStep = 0
      const interval = setInterval(() => {
        if (currentStep >= steps) {
          clearInterval(interval)
          state.brightness = 100
          state.on = true
          console.log(`💡 Fade-in complete`)
        } else {
          state.brightness = Math.min(100, state.brightness + increment)
          currentStep++
        }
      }, 100)
      return {
        status: 'started',
        duration,
        message: `Fading in over ${duration} seconds`
      }
    }
  }
}

startDevice({ td, handlers })