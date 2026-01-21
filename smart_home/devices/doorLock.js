import { startDevice } from './deviceHelper.js'

const CORRECT_PIN = '1234'

const td = {
  title: 'Smart Door Lock',
  description: 'A smart door lock that can be locked/unlocked with PIN authentication',
  properties: {
    locked: {
      type: 'boolean',
      title: 'Lock Status',
      description: 'Current lock status (true = locked, false = unlocked)',
      readOnly: true
    },
    batteryLevel: {
      type: 'integer',
      title: 'Battery Level',
      description: 'Battery level percentage (0-100)',
      minimum: 0,
      maximum: 100,
      readOnly: true
    }
  },
  actions: {
    lock: {
      title: 'Lock',
      description: 'Lock the door'
    },
    unlock: {
      title: 'Unlock',
      description: 'Unlock the door with PIN',
      input: {
        type: 'object',
        properties: {
          pin: {
            type: 'string',
            description: 'PIN code to unlock'
          }
        },
        required: ['pin']
      }
    }
  }
}

let state = {
  locked: true,
  batteryLevel: 85
}

const handlers = {
  setPropertyReadHandler: {
    locked: async () => state.locked,
    batteryLevel: async () => state.batteryLevel
  },
  setActionHandler: {
    lock: async () => {
      state.locked = true
      console.log(`🔒 Door LOCKED`)
      return { locked: state.locked, message: 'Door locked successfully' }
    },
    unlock: async (input) => {
      const inputData = await input.value()
      const pin = inputData?.pin
      if (!pin) throw new Error('PIN required')
      if (pin === CORRECT_PIN) {
        state.locked = false
        console.log(`🔓 Door UNLOCKED with correct PIN`)
        return { locked: state.locked, message: 'Door unlocked successfully' }
      } else {
        console.log(`⚠️  Unlock attempt with incorrect PIN: ${pin}`)
        throw new Error('Incorrect PIN')
      }
    }
  }
}

startDevice({
  td,
  handlers,
  onExposed: () => {
    setInterval(() => {
      if (state.batteryLevel > 0) {
        state.batteryLevel = Math.max(0, state.batteryLevel - 0.1)
        state.batteryLevel = Math.round(state.batteryLevel)
        if (state.batteryLevel === 20) {
          console.log(`🔋 LOW BATTERY WARNING: ${state.batteryLevel}%`)
        }
      }
    }, 60000)
    console.log(`PIN for testing: ${CORRECT_PIN}`)
  }
})