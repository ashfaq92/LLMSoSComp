import express from 'express'
import fs from 'fs'

const app = express()
app.use(express.json())

// Load TD
const td = JSON.parse(fs.readFileSync('./smart_home/devices/tds/light.td.json', 'utf8'))

// Device state
const state = {
  on: false,
  brightness: 0
}

const DEVICE_PORT = 8081
const DIRECTORY_URL = 'http://localhost:8080/things'

// Serve TD at well-known URI
app.get('/.well-known/wot', (req, res) => {
  res.json(addForms(td, DEVICE_PORT))
})

// Properties
app.get('/light/properties/on', (req, res) => {
  res.json({ on: state.on })
})

app.put('/light/properties/on', (req, res) => {
  state.on = req.body.on
  console.log(`💡 Light turned ${state.on ? 'ON' : 'OFF'}`)
  res.json({ on: state.on })
})

app.get('/light/properties/brightness', (req, res) => {
  res.json({ brightness: state.brightness })
})

app.put('/light/properties/brightness', (req, res) => {
  state.brightness = Math.max(0, Math.min(100, req.body.brightness))
  console.log(`💡 Brightness set to ${state.brightness}%`)
  res.json({ brightness: state.brightness })
})

// Actions
app.post('/light/actions/toggle', (req, res) => {
  state.on = !state.on
  console.log(`💡 Light toggled ${state.on ? 'ON' : 'OFF'}`)
  res.json({ on: state.on })
})

app.post('/light/actions/fadeIn', (req, res) => {
  const duration = req.body.duration || 5
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
  
  res.json({ 
    status: 'started',
    duration,
    message: `Fading in over ${duration} seconds`
  })
})

// Helper function to add forms to TD
function addForms(td, port) {
  const basePath = `http://localhost:${port}/light`
  
  return {
    ...td,
    base: basePath,
    properties: {
      on: {
        ...td.properties.on,
        forms: [{
          href: `${basePath}/properties/on`,
          op: ['readproperty', 'writeproperty'],
          contentType: 'application/json'
        }]
      },
      brightness: {
        ...td.properties.brightness,
        forms: [{
          href: `${basePath}/properties/brightness`,
          op: ['readproperty', 'writeproperty'],
          contentType: 'application/json'
        }]
      }
    },
    actions: {
      toggle: {
        ...td.actions.toggle,
        forms: [{
          href: `${basePath}/actions/toggle`,
          op: 'invokeaction',
          contentType: 'application/json'
        }]
      },
      fadeIn: {
        ...td.actions.fadeIn,
        forms: [{
          href: `${basePath}/actions/fadeIn`,
          op: 'invokeaction',
          contentType: 'application/json'
        }]
      }
    }
  }
}

// Register with Thing Directory
async function registerWithDirectory() {
  try {
    const tdWithForms = addForms(td, DEVICE_PORT)


    
    const response = await fetch(DIRECTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/td+json' },
      body: JSON.stringify(tdWithForms)
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

// Start device
app.listen(DEVICE_PORT, () => {
  console.log(`\n💡 Smart Light running on http://localhost:${DEVICE_PORT}`)
  console.log(`   State: ${state.on ? 'ON' : 'OFF'}, Brightness: ${state.brightness}%`)
  console.log(`   TD: http://localhost:${DEVICE_PORT}/.well-known/wot\n`)
  
  // Register after a short delay to ensure directory is ready
  setTimeout(registerWithDirectory, 1000)
})

// Deregister on shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Smart Light...')
  // In production, DELETE from directory here
  process.exit(0)
});