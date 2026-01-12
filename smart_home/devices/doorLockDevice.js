import express from 'express';
import fs from 'fs';

const app = express();
app.use(express.json());

const td = JSON.parse(fs.readFileSync('./tds/doorLock.td.json', 'utf8'));

// Device state
const state = {
  locked: true,
  batteryLevel: 85
};

const CORRECT_PIN = '1234';
const DEVICE_PORT = 8083;
const DIRECTORY_URL = 'http://localhost:8080/things';

// Simulate battery drain
setInterval(() => {
  if (state.batteryLevel > 0) {
    state.batteryLevel = Math.max(0, state.batteryLevel - 0.1);
    state.batteryLevel = Math.round(state.batteryLevel);
    
    if (state.batteryLevel === 20) {
      console.log(`🔋 LOW BATTERY WARNING: ${state.batteryLevel}%`);
    }
  }
}, 60000); // Drain 0.1% per minute

app.get('/.well-known/wot', (req, res) => {
  res.json(addForms(td, DEVICE_PORT));
});

// Properties
app.get('/lock/properties/locked', (req, res) => {
  res.json({ locked: state.locked });
});

app.get('/lock/properties/batteryLevel', (req, res) => {
  res.json({ batteryLevel: state.batteryLevel });
});

// Actions
app.post('/lock/actions/lock', (req, res) => {
  state.locked = true;
  console.log(`🔒 Door LOCKED`);
  res.json({ 
    locked: state.locked,
    message: 'Door locked successfully'
  });
});

app.post('/lock/actions/unlock', (req, res) => {
  const { pin } = req.body || {};
  
  if (!pin) {
    return res.status(400).json({ 
      error: 'PIN required',
      locked: state.locked 
    });
  }
  
  if (pin === CORRECT_PIN) {
    state.locked = false;
    console.log(`🔓 Door UNLOCKED with correct PIN`);
    res.json({ 
      locked: state.locked,
      message: 'Door unlocked successfully'
    });
  } else {
    console.log(`⚠️  Unlock attempt with incorrect PIN: ${pin}`);
    res.status(403).json({ 
      error: 'Incorrect PIN',
      locked: state.locked 
    });
  }
});

function addForms(td, port) {
  const basePath = `http://localhost:${port}/lock`;
  
  return {
    ...td,
    base: basePath,
    properties: {
      locked: {
        ...td.properties.locked,
        forms: [{
          href: `${basePath}/properties/locked`,
          op: 'readproperty',
          contentType: 'application/json'
        }]
      },
      batteryLevel: {
        ...td.properties.batteryLevel,
        forms: [{
          href: `${basePath}/properties/batteryLevel`,
          op: 'readproperty',
          contentType: 'application/json'
        }]
      }
    },
    actions: {
      lock: {
        ...td.actions.lock,
        forms: [{
          href: `${basePath}/actions/lock`,
          op: 'invokeaction',
          contentType: 'application/json'
        }]
      },
      unlock: {
        ...td.actions.unlock,
        forms: [{
          href: `${basePath}/actions/unlock`,
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
  console.log(`\n🔒 Smart Door Lock running on http://localhost:${DEVICE_PORT}`);
  console.log(`   Status: ${state.locked ? 'LOCKED' : 'UNLOCKED'}, Battery: ${state.batteryLevel}%`);
  console.log(`   TD: http://localhost:${DEVICE_PORT}/.well-known/wot`);
  console.log(`   PIN for testing: ${CORRECT_PIN}\n`);
  
  setTimeout(registerWithDirectory, 1000);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Smart Door Lock...');
  process.exit(0);
});