import { startDevice } from './deviceHelper.js'

const td = {
  title: 'DoorBell',
  description: 'A smart doorbell',
  events: {
    bellRung: {
      title: 'Bell rung',
      description: 'The bell was rung',
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
      thing.emitEvent('bellRung')
      console.log('🔔 DoorBell event emitted')
    }, 45000)
  }
})