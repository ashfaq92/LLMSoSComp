import { startDevice } from './deviceHelper.js'

const td = {
  title: 'MotionSensor',
  description: 'A smart motion sensor',
  events: {
    motionDetected: {
      title: 'Motion detected',
      description: 'An event made when motion is detected',
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
      thing.emitEvent('motionDetected')
      console.log('🚶 Motion detected event emitted')
    }, 60000)
  }
})