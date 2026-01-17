// SMART LIGHT DEVICE - Following WoT pattern from myThing.js

import coreModule from '@node-wot/core'
import bindingModule from '@node-wot/binding-http'

const { Servient, Helpers } = coreModule
const { HttpServer } = bindingModule

const httpServer = new HttpServer({ port: 8081 })

const servient = new Servient()
Helpers.setStaticAddress('localhost')
servient.addServer(httpServer)

const DIRECTORY_URL = 'http://localhost:8080/things'

servient.start().then(async (WoT) => {
  console.log('WoT Servient started')
  
  let state = {
    on: false,
    brightness: 0
  }
  
  const thing = await WoT.produce({
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
  })
  
  // Property handlers
  thing.setPropertyReadHandler('on', async () => {
    console.log(`💡 Reading light state: ${state.on ? 'ON' : 'OFF'}`)
    return state.on
  })
  
  thing.setPropertyWriteHandler('on', async (input) => {
    const value = await input.value()
    console.log(`💡 Write handler 'on' received value:`, value, `(type: ${typeof value})`)
    state.on = value
    console.log(`💡 Light turned ${state.on ? 'ON' : 'OFF'}`)
  })
  
  thing.setPropertyReadHandler('brightness', async () => {
    console.log(`💡 Reading brightness: ${state.brightness}%`)
    return state.brightness
  })
  
  thing.setPropertyWriteHandler('brightness', async (input) => {
    const value = await input.value()
    console.log(`💡 Write handler 'brightness' received value:`, value, `(type: ${typeof value})`)
    state.brightness = Math.max(0, Math.min(100, value))
    console.log(`💡 Brightness set to ${state.brightness}%`)
  })
  
  // Action handlers
  thing.setActionHandler('toggle', async () => {
    state.on = !state.on
    console.log(`💡 Light toggled ${state.on ? 'ON' : 'OFF'}`)
    return { on: state.on }
  })
  
  thing.setActionHandler('fadeIn', async (input) => {
    const inputData = await input.value()
    const duration = inputData?.duration || 5
    console.log(`💡 Fading in over ${duration} seconds`)
    
    // Simulate fade-in
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
  
  console.log(`\n💡 Smart Light running on http://localhost:8081`)
  console.log(`   State: ${state.on ? 'ON' : 'OFF'}, Brightness: ${state.brightness}%`)
  console.log(`   TD: http://localhost:8081/.well-known/wot\n`)
  
  // Register after a short delay to ensure directory is ready
  setTimeout(registerWithDirectory, 1000)
})

// Deregister on shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Smart Light...')
  process.exit(0)
})