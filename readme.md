# WoT-MCP Bridge

Bridge between W3C Web of Things (WoT) and Model Context Protocol (MCP) for LLM control of IoT devices.

This project demonstrates how to expose W3C WoT devices to Large Language Models (LLMs) through the Model Context Protocol, enabling natural language control of IoT devices.


# Quick Start

## Install Dependencies

```bash
npm install
```

## Start Components (in separate terminals)

**Terminal 1 - Thing Directory:**
```bash
node ./smart_home/devices/thingDirectory.js
```

**Terminal 2 - Light Device:**
```bash
node ./smart_home/devices/lightDevice.js
```

**Terminal 3 - Thermostat Device:**
```bash
node ./smart_home/devices/thermostatDevice.js
```

**Terminal 4 - Door Lock Device:**
```bash
node ./smart_home/devices/doorLockDevice.js
```

**Terminal 5 - Monitor MCP Server:**
```bash
npx @modelcontextprotocol/inspector node ./smart_home/td2mcp.js
```

This opens the MCP Inspector where you can:
- See all discovered devices
- Read property values
- Invoke actions
- Test the integration

### 3. Use with Claude Desktop

Add to `claude_desktop_config.json`:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "wot-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/td2mcp.js"]
    }
  }
}
```


# Workflows

## Basic

- "Turn on the smart light"
- "What's the current temperature?"
- "Set thermostat to 22 degrees"
- "Lock the door"

## Leaving the house (fully connected)

**Scenario:** You are leaving the house.

**Step 1: Check the door**

* If the **door is unlocked**, lock it.

  * After locking, check the **temperature**.

    * If temperature < 20°C → set thermostat to 22°C.
    * Else → skip thermostat adjustment.
* Else (door is already locked) → skip locking and **dim/turn off smart light**.

**Step 2: Smart light behavior depends on door**

* If door was successfully locked → turn off the smart light.
* If door was already locked → leave the smart light on (maybe you forgot something and might return).

**Step 3: Optional branching based on thermostat adjustment**

* If thermostat was changed → wait 5 minutes, then check temperature again:

  * If temperature still < 20°C → send alert “house still cold.”
  * Else → finish workflow.




## Project Structure

```
wot-mcp-bridge/
├── package.json              # Dependencies and scripts
├── README.md                 # This file
├── tds/                      # Thing Descriptions (metadata)
│   ├── light.td.json
│   ├── thermostat.td.json
│   └── door-lock.td.json
├── devices/                  # Device implementations
│   ├── light-device.js       # Smart light (port 8081)
│   ├── thermostat-device.js  # Thermostat (port 8082)
│   └── door-lock-device.js   # Door lock (port 8083)
├── thing-directory.js        # WoT Thing Directory (port 8080)
└── td2mcp.js                 # MCP Bridge Server
```

## Devices

### 💡 Smart Light (port 8081)
- **Properties:** on (bool), brightness (0-100)
- **Actions:** toggle, fadeIn
- **Test:** `curl http://localhost:8081/light/properties/on`

### 🌡️ Smart Thermostat (port 8082)
- **Properties:** temperature (read-only), targetTemperature, mode, humidity
- **Actions:** setSchedule
- **Test:** `curl http://localhost:8082/thermostat/properties/temperature`

### 🔒 Smart Door Lock (port 8083)
- **Properties:** locked (bool), batteryLevel
- **Actions:** lock, unlock (requires PIN: 1234)
- **Test:** `curl http://localhost:8083/lock/properties/locked`

## API Endpoints

### Thing Directory (port 8080)
```bash
# List all registered devices
curl http://localhost:8080/things

# Get specific device TD
curl http://localhost:8080/things/urn:dev:ops:light-001

# Search devices
curl http://localhost:8080/search?title=light
```

### Device APIs
Each device follows the pattern:
```bash
# Read property
GET /device/properties/{propertyName}

# Write property
PUT /device/properties/{propertyName}
Body: {"{propertyName}": value}

# Invoke action
POST /device/actions/{actionName}
Body: {action parameters}

# Get Thing Description
GET /.well-known/wot
```

## Testing Examples

### Manual Testing

```bash
# Turn on the light
curl -X POST http://localhost:8081/light/actions/toggle

# Check light status
curl http://localhost:8081/light/properties/on

# Set thermostat temperature
curl -X PUT http://localhost:8082/thermostat/properties/targetTemperature \
  -H "Content-Type: application/json" \
  -d '{"targetTemperature": 23}'

# Unlock door (correct PIN)
curl -X POST http://localhost:8083/lock/actions/unlock \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'

# Try wrong PIN (will fail)
curl -X POST http://localhost:8083/lock/actions/unlock \
  -H "Content-Type: application/json" \
  -d '{"pin": "0000"}'
```

### MCP Inspector Testing

1. Run `npm run test:mcp`
2. In the web UI:
   - **Resources tab:** View all device properties
   - **Tools tab:** See all available actions
   - Click "Run Tool" to control devices

## W3C WoT Compliance

This implementation follows:
- [WoT Architecture 1.1](https://www.w3.org/TR/wot-architecture11/)
- [WoT Thing Description 1.1](https://www.w3.org/TR/wot-thing-description11/)
- [WoT Discovery](https://www.w3.org/TR/wot-discovery/)

Key compliance features:
- ✅ Thing Descriptions with proper `@context`
- ✅ Thing Directory for registration and discovery
- ✅ Well-known URIs (`/.well-known/wot`)
- ✅ Hypermedia controls (forms)
- ✅ Properties, Actions, Events model

## Research Applications

This bridge enables research on:
1. **LLM-IoT Integration:** Natural language control of devices
2. **Semantic Interoperability:** How TDs help LLMs understand devices
3. **Multi-device Orchestration:** Can LLMs coordinate multiple devices?
4. **WoT vs Raw APIs:** Does TD structure improve LLM performance?
5. **Security:** Safe LLM-IoT interaction patterns

## Extending

### Add a New Device

1. Create TD in `tds/my-device.td.json`
2. Create device in `devices/my-device.js`
3. Follow the pattern from existing devices
4. Device auto-registers with Thing Directory on startup
5. MCP bridge auto-discovers it

### Custom Actions

Add to device TD:
```json
"actions": {
  "myAction": {
    "description": "Does something cool",
    "input": {
      "type": "object",
      "properties": {
        "param1": {"type": "string"}
      }
    }
  }
}
```

Implement in device:
```javascript
app.post('/device/actions/myAction', (req, res) => {
  const { param1 } = req.body;
  // Do something
  res.json({ status: 'ok' });
});
```

## Troubleshooting

**"Thing Directory not available"**
- Make sure `thing-directory.js` is running on port 8080

**"No things discovered"**
- Start Thing Directory first
- Then start devices (they register on startup)
- Check device logs for registration confirmation

**MCP Inspector shows no tools**
- Restart `td2mcp.js` after starting devices
- Check `http://localhost:8080/things` shows registered TDs

**Port already in use**
- Kill process: `lsof -ti:8080 | xargs kill -9`
- Or change port in device files

## License

MIT

## Contributing

Contributions welcome! This is a research project exploring WoT-LLM integration.