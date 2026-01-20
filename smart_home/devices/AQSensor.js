// SMART AIR QUALITY SENSOR - WoT pattern

import coreModule from '@node-wot/core'
import bindingModule from '@node-wot/binding-http'

const { Servient, Helpers } = coreModule
const { HttpServer } = bindingModule

const httpServer = new HttpServer({ port: 8085 })

const servient = new Servient()
Helpers.setStaticAddress('localhost')
servient.addServer(httpServer)

const DIRECTORY_URL = 'http://localhost:8080/things'

let thing // Declare thing outside for access in shutdown handler

servient.start().then(async (WoT) => {
  console.log('WoT Servient started')

  let state = {
    airQuality: 50, // AQI (Air Quality Index)
    lastCalibration: null
  }

  // Simulate air quality changes
  setInterval(() => {
    state.airQuality = Math.max(0, Math.min(500, state.airQuality + (Math.random() - 0.5) * 10))
    state.airQuality = Math.round(state.airQuality)
  }, 3000)

  thing = await WoT.produce({ // Assign to the outer variable
    title: 'Air Quality Sensor',
    description: 'A sensor that measures air quality (AQI) and supports calibration',
    properties: {
      airQuality: {
        type: 'integer',
        title: 'Air Quality Index',
        description: 'Current AQI (0-500, lower is better)',
        readOnly: true,
        minimum: 0,
        maximum: 500
      },
      lastCalibration: {
        type: 'string',
        title: 'Last Calibration',
        description: 'Timestamp of last calibration',
        readOnly: true
      }
    },
    actions: {
      calibrate: {
        title: 'Calibrate Sensor',
        description: 'Calibrate the air quality sensor',
        input: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Calibration code (for security)'
            }
          },
          required: ['code']
        }
      }
    }
  })

  // Property handlers
  thing.setPropertyReadHandler('airQuality', async () => {
    console.log(`🌫️ Reading air quality: AQI ${state.airQuality}`)
    return state.airQuality
  })

  thing.setPropertyReadHandler('lastCalibration', async () => {
    return state.lastCalibration
  })

  // Action handler
  thing.setActionHandler('calibrate', async (input) => {
    const inputData = await input.value()
    const { code } = inputData || {}
    if (code !== 'secret123') {
      throw new Error('Invalid calibration code')
    }
    state.lastCalibration = new Date().toISOString()
    console.log(`🌫️ Sensor calibrated at ${state.lastCalibration}`)
    return { status: 'calibrated', time: state.lastCalibration }
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

  console.log(`\n🌫️ Air Quality Sensor running on http://localhost:8085`)
  console.log(`   AQI: ${state.airQuality}, Last Calibration: ${state.lastCalibration}`)
  console.log(`   TD: http://localhost:8085/.well-known/wot\n`)

  setTimeout(registerWithDirectory, 1000)
})

// Deregister on shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Air Quality Sensor...')
  // Deregister from Thing Directory
  if (thing) {
    try {
      const response = await fetch(`${DIRECTORY_URL}/${thing.getThingDescription().id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        console.log('✓ Deregistered from Thing Directory')
      } else {
        console.log('⚠️ Failed to deregister from Thing Directory')
      }
    } catch (err) {
      console.log(`⚠️ Could not deregister: ${err.message}`)
    }
  }
  process.exit(0)
})