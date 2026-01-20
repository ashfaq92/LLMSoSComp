// SMART THERMOSTAT - Following WoT pattern from myThing.js

import coreModule from '@node-wot/core'
import bindingModule from '@node-wot/binding-http'

const { Servient, Helpers } = coreModule
const { HttpServer } = bindingModule

const httpServer = new HttpServer({ port: 8082 })

const servient = new Servient()
Helpers.setStaticAddress('localhost')
servient.addServer(httpServer)

const DIRECTORY_URL = 'http://localhost:8080/things'

let thing // Declare thing outside for access in shutdown handler

servient.start().then(async (WoT) => {
  console.log('WoT Servient started')
  
  let state = {
    temperature: 22.5,
    targetTemperature: 21.0,
    mode: 'auto',
    humidity: 45
  }
  
  // Simulate temperature changes - faster adjustment for testing
  setInterval(() => {
    // Simulate temperature adjusting toward target (faster for testing)
    if (state.mode !== 'off') {
      const diff = state.targetTemperature - state.temperature
      state.temperature += diff * 0.3 // 30% adjustment per interval (faster)
      state.temperature = Math.round(state.temperature * 10) / 10
    }
    
    // Simulate humidity fluctuation
    state.humidity = Math.max(30, Math.min(70, state.humidity + (Math.random() - 0.5) * 2))
    state.humidity = Math.round(state.humidity)
  }, 2000)  // 2 second interval (faster than 5 seconds)
  
  thing = await WoT.produce({
    title: 'Smart Thermostat',
    description: 'A smart thermostat that controls temperature, humidity, and heating/cooling modes',
    properties: {
      temperature: {
        type: 'number',
        title: 'Current Temperature',
        description: 'Current room temperature in Celsius',
        readOnly: true,
        minimum: -50,
        maximum: 50
      },
      targetTemperature: {
        type: 'number',
        title: 'Target Temperature',
        description: 'Target temperature in Celsius',
        readOnly: false,
        minimum: 10,
        maximum: 30
      },
      mode: {
        type: 'string',
        title: 'Operation Mode',
        description: 'Current operation mode (off, heat, cool, auto)',
        readOnly: false,
        enum: ['off', 'heat', 'cool', 'auto']
      },
      humidity: {
        type: 'integer',
        title: 'Humidity',
        description: 'Current humidity level percentage',
        readOnly: true,
        minimum: 0,
        maximum: 100
      }
    },
    actions: {
      setSchedule: {
        title: 'Set Schedule',
        description: 'Set a temperature schedule for a specific time',
        input: {
          type: 'object',
          properties: {
            time: {
              type: 'string',
              description: 'Time in HH:MM format'
            },
            temperature: {
              type: 'number',
              description: 'Target temperature for this time'
            }
          },
          required: ['time', 'temperature']
        }
      }
    }
  })
  
  // Property handlers
  thing.setPropertyReadHandler('temperature', async () => {
    console.log(`🌡️  Reading current temperature: ${state.temperature}°C`)
    return state.temperature
  })
  
  thing.setPropertyReadHandler('targetTemperature', async () => {
    console.log(`🌡️  Reading target temperature: ${state.targetTemperature}°C`)
    return state.targetTemperature
  })
  
  thing.setPropertyWriteHandler('targetTemperature', async (input) => {
    const value = await input.value()
    const oldTarget = state.targetTemperature
    state.targetTemperature = Math.max(10, Math.min(30, value))
    console.log(`🌡️  Target temperature set from ${oldTarget}°C to ${state.targetTemperature}°C`)
    console.log(`    Current temp: ${state.temperature}°C (will adjust toward target)`)
  })
  
  thing.setPropertyReadHandler('mode', async () => {
    console.log(`🌡️  Reading mode: ${state.mode}`)
    return state.mode
  })
  
  thing.setPropertyWriteHandler('mode', async (input) => {
    const value = await input.value()
    const validModes = ['off', 'heat', 'cool', 'auto']
    if (validModes.includes(value)) {
      state.mode = value
      console.log(`🌡️  Mode set to ${state.mode}`)
    } else {
      throw new Error('Invalid mode')
    }
  })
  
  thing.setPropertyReadHandler('humidity', async () => {
    console.log(`💧 Reading humidity: ${state.humidity}%`)
    return state.humidity
  })
  
  // Action handlers
  thing.setActionHandler('setSchedule', async (input) => {
    const inputData = await input.value()
    const { time, temperature } = inputData || {}
    
    if (!time || temperature === undefined) {
      throw new Error('time and temperature required')
    }
    
    console.log(`🌡️  Schedule set: ${time} -> ${temperature}°C`)
    return { 
      status: 'scheduled',
      time,
      temperature 
    }
  })

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
  
  console.log(`\n🌡️  Smart Thermostat running on http://localhost:8082`)
  console.log(`   Temp: ${state.temperature}°C, Target: ${state.targetTemperature}°C, Mode: ${state.mode}`)
  console.log(`   TD: http://localhost:8082/.well-known/wot\n`)

  // Register after a short delay to ensure directory is ready
  setTimeout(registerWithDirectory, 1000)
})





// Deregister on shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Smart Thermostat...')
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