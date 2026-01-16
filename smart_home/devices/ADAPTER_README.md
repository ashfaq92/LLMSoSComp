# Generic Device Adapter

## Overview

Instead of writing individual device servers (like `thermostatDevice.js`, `lightDevice.js`, etc.), the **Generic Device Adapter** automatically creates HTTP servers for any device based on its Thing Description (TD).

## How it Works

1. **Watches Thing Directory** - Polls the Thing Directory for registered devices
2. **Consumes TDs dynamically** - Uses node-wot to understand each device's capabilities
3. **Auto-generates endpoints** - Creates REST endpoints for all properties and actions
4. **Zero per-device code** - Works with ANY device TD without additional coding

## Architecture

```
┌─────────────────────┐
│  Thing Directory    │
│  (Port 8080)        │
└──────────┬──────────┘
           │ Watches every 5s
           ▼
┌─────────────────────────────────┐
│  Generic Device Adapter Service │
│  (genericDeviceAdapter.js)      │
└─────────┬──────────┬──────────┬─┘
          │          │          │
          ▼          ▼          ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Thermostat│ │  Light   │ │ Door Lock│
   │ 9000      │ │ 9001     │ │ 9002     │
   └──────────┘ └──────────┘ └──────────┘
```

## Getting Started

### 1. Install Dependencies

```bash
npm install wot-servient wot-td express
```

### 2. Run the Thing Directory

```bash
node smart_home/thingDirectory.js
```

### 3. Run the Generic Adapter

```bash
node smart_home/devices/genericDeviceAdapter.js
```

The adapter will:
- Connect to the Thing Directory
- Watch for registered devices
- Automatically create adapters on ports 9000, 9001, 9002, etc.

### 4. (Optional) Run Original Device Simulators

For testing, you can still run the original device simulators:

```bash
node smart_home/devices/lightDevice.js
node smart_home/devices/thermostatDevice.js
node smart_home/devices/doorLockDevice.js
```

These will register with the Thing Directory, and the generic adapter will automatically pick them up.

## How Properties and Actions Work

### Reading a Property
```bash
GET http://localhost:9000/properties/temperature
→ { "temperature": 22.5 }
```

### Writing a Property
```bash
PUT http://localhost:9000/properties/targetTemperature
Body: { "value": 23.0 }
→ { "success": true, "targetTemperature": 23.0 }
```

### Invoking an Action
```bash
POST http://localhost:9000/actions/setSchedule
Body: { "time": "10:30", "temperature": 20 }
→ { "success": true, "result": {...} }
```

## Key Advantages

✅ **Scalable** - Add new devices without writing new code
✅ **Standards-based** - Works with any W3C WoT TD
✅ **Flexible** - Handles different property/action signatures automatically
✅ **Maintainable** - Single adapter codebase instead of device-specific servers

## What Gets Generated

For each device, the adapter inspects the TD and creates:

**Properties endpoints:**
- `GET /properties/{propName}` - Read property
- `PUT /properties/{propName}` - Write property (if supported)

**Action endpoints:**
- `POST /actions/{actionName}` - Invoke action

**Discovery:**
- `GET /.well-known/wot` - Returns updated TD with new endpoint URLs

## Fallback Mode

If the Thing Directory is not available, the adapter falls back to loading local TDs from `./smart_home/devices/tds/` directory.

## Notes

- The adapter uses `node-wot`'s `WoT.consume(td)` to handle all protocol bindings
- Forms in the original TD are updated to point to the adapter's endpoints
- Logging shows which properties/actions are being accessed
- Each device gets its own port (9000+) for isolation
