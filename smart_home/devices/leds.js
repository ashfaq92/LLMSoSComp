import { startDevice } from './deviceHelper.js'

const td = {
  title: 'LEDs',
  description: 'A smart LED array',
  actions: {
    blink: { title: 'Blink LEDs', description: 'Blinks the LEDs' },
    LEDsOn: { title: 'Turn LEDs on', description: 'Turns on the LEDs' },
    LEDsOff: { title: 'Turn LEDs off', description: 'Turns off the LEDs' }
  }
}

let state = { on: false }

const handlers = {
  setActionHandler: {
    blink: async () => {
      console.log('💡 LEDs blinking')
      return { status: 'blinking' }
    },
    LEDsOn: async () => {
      state.on = true
      console.log('💡 LEDs turned ON')
      return { on: true }
    },
    LEDsOff: async () => {
      state.on = false
      console.log('💡 LEDs turned OFF')
      return { on: false }
    }
  }
}

startDevice({ td, handlers })