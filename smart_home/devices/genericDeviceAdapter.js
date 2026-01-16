import express from 'express';
import fs from 'fs';
import { Servient } from 'wot-servient';
import * as TDs from 'wot-td';

const servient = new Servient();

// Map to store consumed Things and their metadata
const consumedThings = new Map();
const deviceServers = new Map(); // Map to track which port each device is using

/**
 * Dynamically creates an Express server for a given Thing Description
 * @param {Object} td - Thing Description
 * @param {number} port - Port to run the server on
 * @returns {Promise<void>}
 */
async function createDynamicDeviceServer(td, port) {
  const app = express();
  app.use(express.json());
  
  const deviceId = td.title || td.id;
  console.log(`\n📡 Creating generic adapter for: ${deviceId}`);
  
  try {
    // Consume the Thing Description using node-wot
    const thing = await servient.consume(td);
    consumedThings.set(deviceId, thing);
    
    // Serve the TD at well-known URI
    app.get('/.well-known/wot', (req, res) => {
      const updatedTd = { ...td };
      const basePath = `http://localhost:${port}`;
      
      // Update all forms to point to this adapter
      if (updatedTd.properties) {
        Object.entries(updatedTd.properties).forEach(([propName, propSchema]) => {
          propSchema.forms = [{
            href: `${basePath}/properties/${propName}`,
            op: Array.isArray(propSchema.op) ? propSchema.op : [propSchema.op],
            contentType: 'application/json'
          }];
        });
      }
      
      if (updatedTd.actions) {
        Object.entries(updatedTd.actions).forEach(([actionName, actionSchema]) => {
          actionSchema.forms = [{
            href: `${basePath}/actions/${actionName}`,
            op: 'invokeaction',
            contentType: 'application/json'
          }];
        });
      }
      
      res.json(updatedTd);
    });
    
    // === DYNAMICALLY CREATE PROPERTY ENDPOINTS ===
    if (td.properties) {
      Object.entries(td.properties).forEach(([propName, propSchema]) => {
        const opArray = Array.isArray(propSchema.op) ? propSchema.op : [propSchema.op];
        
        // Read property endpoint
        if (opArray.includes('readproperty') || !propSchema.op) {
          app.get(`/properties/${propName}`, async (req, res) => {
            try {
              const value = await thing.readProperty(propName);
              console.log(`📖 [${deviceId}] Read ${propName}: ${JSON.stringify(value)}`);
              res.json({ [propName]: value });
            } catch (error) {
              console.error(`❌ Error reading ${propName}:`, error.message);
              res.status(500).json({ error: error.message });
            }
          });
        }
        
        // Write property endpoint
        if (opArray.includes('writeproperty')) {
          app.put(`/properties/${propName}`, async (req, res) => {
            try {
              const value = req.body.value !== undefined ? req.body.value : req.body;
              await thing.writeProperty(propName, value);
              console.log(`✏️  [${deviceId}] Wrote ${propName}: ${JSON.stringify(value)}`);
              res.json({ success: true, [propName]: value });
            } catch (error) {
              console.error(`❌ Error writing ${propName}:`, error.message);
              res.status(500).json({ error: error.message });
            }
          });
        }
      });
    }
    
    // === DYNAMICALLY CREATE ACTION ENDPOINTS ===
    if (td.actions) {
      Object.entries(td.actions).forEach(([actionName, actionSchema]) => {
        app.post(`/actions/${actionName}`, async (req, res) => {
          try {
            const result = await thing.invokeAction(actionName, req.body);
            console.log(`⚡ [${deviceId}] Invoked ${actionName}`);
            res.json({ 
              success: true, 
              action: actionName, 
              result: result 
            });
          } catch (error) {
            console.error(`❌ Error invoking ${actionName}:`, error.message);
            res.status(500).json({ error: error.message });
          }
        });
      });
    }
    
    // Start the server
    app.listen(port, () => {
      console.log(`✅ Generic adapter for "${deviceId}" running on http://localhost:${port}`);
      console.log(`   TD: http://localhost:${port}/.well-known/wot`);
      if (td.properties) {
        console.log(`   Properties: ${Object.keys(td.properties).join(', ')}`);
      }
      if (td.actions) {
        console.log(`   Actions: ${Object.keys(td.actions).join(', ')}`);
      }
      console.log('');
    });
    
    deviceServers.set(deviceId, port);
    
  } catch (error) {
    console.error(`❌ Failed to create adapter for ${deviceId}:`, error.message);
  }
}

/**
 * Fetches all TDs from the Thing Directory and creates adapters
 */
async function watchThingDirectory(directoryUrl = 'http://localhost:8080/things') {
  let nextPort = 9000; // Start assigning ports from 9000
  
  setInterval(async () => {
    try {
      const response = await fetch(`${directoryUrl}/all`);
      if (!response.ok) throw new Error(`Directory returned ${response.status}`);
      
      const things = await response.json();
      
      things.forEach((td) => {
        const deviceId = td.title || td.id;
        
        // Check if we already have this device
        if (!consumedThings.has(deviceId)) {
          createDynamicDeviceServer(td, nextPort);
          nextPort++;
        }
      });
      
    } catch (error) {
      console.log(`⚠️  Thing Directory watch error: ${error.message}`);
    }
  }, 5000); // Poll every 5 seconds
}

/**
 * Alternative: Load TDs from local files (for testing)
 */
async function loadLocalTDs() {
  const tdsDir = './smart_home/devices/tds';
  const tdFiles = fs.readdirSync(tdsDir).filter(f => f.endsWith('.json'));
  
  let port = 9000;
  for (const file of tdFiles) {
    const tdPath = `${tdsDir}/${file}`;
    const td = JSON.parse(fs.readFileSync(tdPath, 'utf8'));
    await createDynamicDeviceServer(td, port);
    port++;
  }
}

/**
 * Main entry point
 */
async function start() {
  console.log('\n🚀 Starting Generic Device Adapter Service\n');
  
  // Initialize WoT servient
  await servient.start();
  
  // Try to watch the Thing Directory, fall back to local TDs if it fails
  try {
    console.log('📡 Attempting to connect to Thing Directory...');
    await fetch('http://localhost:8080/things');
    console.log('✅ Thing Directory found. Watching for devices...\n');
    watchThingDirectory();
  } catch (error) {
    console.log('⚠️  Thing Directory not available. Loading local TDs instead.\n');
    await loadLocalTDs();
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Generic Device Adapter Service...');
  servient.stop();
  process.exit(0);
});

// Start the service
start().catch(console.error);
