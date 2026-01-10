import express from 'express';
import fs from 'fs';

const app = express();
app.use(express.json());

const td = JSON.parse(fs.readFileSync('./tds/thermostat.td.json', 'utf8'));

// Device state
const state = {
  temperature: 22.5,
  targetTemperature: 21.0,
  mode: 'auto',
  humidity: 45
};

const DEVICE_PORT = 8082;
const DIRECTORY_URL = 'http://localhost:8080/things';

// Simulate temperature changes
setInterval(() => {
  // Simulate temperature adjusting toward target
  if (state.mode !== 'off') {
    const diff = state.targetTemperature - state.temperature;
    state.temperature += diff * 0.1; // 10% adjustment per interval
    state.temperature = Math.round(state.temperature * 10) / 10;
  }
  
  // Simulate humidity fluctuation
  state.humidity = Math.max(30, Math.min(70, state.humidity + (Math.random() - 0.5) * 2));
  state.humidity = Math.round(state.humidity);
}, 5000);

app.get('/.well-known/wot', (req, res) => {
  res.json(addForms(td, DEVICE_PORT));
});

// Properties
app.get('/thermostat/properties/temperature', (req, res) => {
  res.json({ temperature: state.temperature });
});

app.get('/thermostat/properties/targetTemperature', (req, res) => {
  res.json({ targetTemperature: state.targetTemperature });
});

app.put('/thermostat/properties/targetTemperature', (req, res) => {
  state.targetTemperature = Math.max(10, Math.min(30, req.body.targetTemperature));
  console.log(`🌡️  Target temperature set to ${state.targetTemperature}°C`);
  res.json({ targetTemperature: state.targetTemperature });
});

app.get('/thermostat/properties/mode', (req, res) => {
  res.json({ mode: state.mode });
});

app.put('/thermostat/properties/mode', (req, res) => {
  const validModes = ['off', 'heat', 'cool', 'auto'];
  if (validModes.includes(req.body.mode)) {
    state.mode = req.body.mode;
    console.log(`🌡️  Mode set to ${state.mode}`);
    res.json({ mode: state.mode });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
});

app.get('/thermostat/properties/humidity', (req, res) => {
  res.json({ humidity: state.humidity });
});

// Actions
app.post('/thermostat/actions/setSchedule', (req, res) => {
  const { time, temperature } = req.body;
  console.log(`🌡️  Schedule set: ${time} -> ${temperature}°C`);
  res.json({ 
    status: 'scheduled',
    time,
    temperature 
  });
});

function addForms(td, port) {
  const basePath = `http://localhost:${port}/thermostat`;
  
  return {
    ...td,
    base: basePath,
    properties: {
      temperature: {
        ...td.properties.temperature,
        forms: [{
          href: `${basePath}/properties/temperature`,
          op: 'readproperty',
          contentType: 'application/json'
        }]
      },
      targetTemperature: {
        ...td.properties.targetTemperature,
        forms: [{
          href: `${basePath}/properties/targetTemperature`,
          op: ['readproperty', 'writeproperty'],
          contentType: 'application/json'
        }]
      },
      mode: {
        ...td.properties.mode,
        forms: [{
          href: `${basePath}/properties/mode`,
          op: ['readproperty', 'writeproperty'],
          contentType: 'application/json'
        }]
      },
      humidity: {
        ...td.properties.humidity,
        forms: [{
          href: `${basePath}/properties/humidity`,
          op: 'readproperty',
          contentType: 'application/json'
        }]
      }
    },
    actions: {
      setSchedule: {
        ...td.actions.setSchedule,
        forms: [{
          href: `${basePath}/actions/setSchedule`,
          op: 'invokeaction',
          contentType: 'application/json'
        }]
      }
    }
  };
}

async function registerWithDirectory() {
  try {
    const tdWithForms = addForms(td, DEVICE_PORT);
    const response = await fetch(DIRECTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/td+json' },
      body: JSON.stringify(tdWithForms)
    });
    
    if (response.ok) {
      console.log(`✓ Registered with Thing Directory`);
    }
  } catch (err) {
    console.log(`⚠️  Could not register: ${err.message}`);
  }
}

app.listen(DEVICE_PORT, () => {
  console.log(`\n🌡️  Smart Thermostat running on http://localhost:${DEVICE_PORT}`);
  console.log(`   Temp: ${state.temperature}°C, Target: ${state.targetTemperature}°C, Mode: ${state.mode}`);
  console.log(`   TD: http://localhost:${DEVICE_PORT}/.well-known/wot\n`);
  
  setTimeout(registerWithDirectory, 1000);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Smart Thermostat...');
  process.exit(0);
});