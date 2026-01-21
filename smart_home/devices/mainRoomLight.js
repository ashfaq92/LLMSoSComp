import { startDevice } from './deviceHelper.js'

const td = {
  title: 'MainRoomLight',
  description: 'A main room light',
  actions: {
    lightOn: { title: 'Turn light on', description: 'Turns the light on' },
    lightOff: { title: 'Turn light off', description: 'Turns the light off' }
  }
}

let state = { on: false }

const handlers = {
  setActionHandler: {
    lightOn: async () => {
      state.on = true
      console.log('💡 MainRoomLight ON')
      return { on: true }
    },
    lightOff: async () => {
      state.on = false
      console.log('💡 MainRoomLight OFF')
      return { on: false }
    }
  }
}

startDevice({ td, handlers })