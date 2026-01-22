import { startDevice } from './deviceHelper.js'

const td = {
  title: 'Alarm',
  description: 'A smart alarm that can ring',
  events: {
    alarmRinging: {
      title: 'Alarm Ringing',
      description: 'This alarm has started ringing',
      data: { type: 'null' }
    }
  }
}

const handlers = {}

startDevice({
  td,
  handlers,
  route: 'alarm',
  onExposed: (thing) => {
    setInterval(() => {
      thing.emitEvent('alarmRinging', null)
      console.log('⏰ Alarm event emitted')
    }, 1000)
  }
})