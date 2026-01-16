// SMART DOOR LOCK - Following WoT pattern from myThing.js

const Servient = require('@node-wot/core').Servient
const HttpServer = require('@node-wot/binding-http').HttpServer
const Helpers = require('@node-wot/core').Helpers

const httpServer = new HttpServer({ port: 8083 })

const servient = new Servient()
Helpers.setStaticAddress('localhost')
servient.addServer(httpServer)

const CORRECT_PIN = '1234'
const DIRECTORY_URL = 'http://localhost:8080/things'

servient.start().then(async (WoT) => {
  console.log('WoT Servient started')
  
  let state = {
    locked: true,
    batteryLevel: 85
  }
  
  // Simulate battery drain
  setInterval(() => {
    if (state.batteryLevel > 0) {
      state.batteryLevel = Math.max(0, state.batteryLevel - 0.1)
      state.batteryLevel = Math.round(state.batteryLevel)
      
      if (state.batteryLevel === 20) {
        console.log(`🔋 LOW BATTERY WARNING: ${state.batteryLevel}%`)
      }
    }
  }, 60000) // Drain 0.1% per minute
  
  const thing = await WoT.produce({
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
  })
  
  // Property handlers
  thing.setPropertyReadHandler('locked', async () => {
    return state.locked
  })
  
  thing.setPropertyReadHandler('batteryLevel', async () => {
    return state.batteryLevel
  })
  
  // Action handlers
  thing.setActionHandler('lock', async () => {
    state.locked = true
    console.log(`🔒 Door LOCKED`)
    return { 
      locked: state.locked,
      message: 'Door locked successfully'
    }
  })
  
  thing.setActionHandler('unlock', async (input) => {
    const inputData = await input.value()
    const pin = inputData?.pin
    
    if (!pin) {
      throw new Error('PIN required')
    }
    
    if (pin === CORRECT_PIN) {
      state.locked = false
      console.log(`🔓 Door UNLOCKED with correct PIN`)
      return { 
        locked: state.locked,
        message: 'Door unlocked successfully'
      }
    } else {
      console.log(`⚠️  Unlock attempt with incorrect PIN: ${pin}`)
      throw new Error('Incorrect PIN')
    }
  })
  // Register with Thing Directory
  async function registerWithDirectory() {
    try {
      const response = await fetch(DIRECTORY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/td+json' },
        body: JSON.stringify(thing.getThingDescription())
      })
      
      if (response.ok) {
        console.log(`✓ Registered with Thing Directory`)
      } else {
        console.log(`⚠️ ${response.statusText}  Thing Directory not available`)
      }
    } catch (err) {
      console.log(`⚠️  Could not register: ${err.message}`)
    }
  }
  
  
  await thing.expose()
  
  console.log(`\n🔒 Smart Door Lock running on http://localhost:8083`)
  console.log(`   Status: ${state.locked ? 'LOCKED' : 'UNLOCKED'}, Battery: ${state.batteryLevel}%`)
  console.log(`   TD: http://localhost:8083/.well-known/wot`)
  console.log(`   PIN for testing: ${CORRECT_PIN}\n`)

  // Register after a short delay to ensure directory is ready
  setTimeout(registerWithDirectory, 1000)
})

// Deregister on shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Smart Door Lock...')
  process.exit(0)
})