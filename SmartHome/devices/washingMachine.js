import { startDevice } from './deviceHelper.js'

const td = {
  title: 'WashingMachine',
  description: 'A smart washing machine',
  events: {
    finishedCycle: {
      title: 'Wash cycle complete',
      description: 'Sends a notification at the end of a wash cycle',
      data: { type: 'null' }
    }
  }
}

const handlers = {}

startDevice({
  td,
  handlers,
  onExposed: (thing) => {
    setInterval(() => {
      thing.emitEvent('finishedCycle')
      console.log('🧺 Washing cycle finished event emitted')
    }, 120000)
  }
})