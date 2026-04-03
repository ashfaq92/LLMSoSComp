# Simulated WoT Devices

This smart home project contains simulated Web of Things (WoT) devices for testing and development purposes. 

## Prerequisites

- Node.js 20+

## Installation

```bash
cd smart-home
npm install
```

## Starting all the devices

```bash
npm run start:devices
```

## Available Devices

### 1. HTTP Thermostat
A simple thermostat accessible via HTTP.
- **URL**: `http://localhost:8080/httpthermostat`
- **Capabilities**:
  - Properties: `temperature` (read-only), `targetTemperature` (read/write), `overheatThreshold` (read/write)
  - Actions: `setTemperature` (set the target temperature)
  - Events: `overheating`

**Run:**
```bash
cd smart-home/devices
node thermostat.js
```

### 2. HTTP Smart Lamp
A smart lamp accessible via HTTP.
- **URL**: `http://localhost:8081/mylamp`
- **Capabilities**:
  - Properties: `state` (boolean)
  - Actions: `toggle` (toggle the lamp on/off)

**Run:**
```bash
cd smart-home/devices
node thermostat.js
```




## System thing
```
const DOORBELL_URL = 'http://localhost:8085/doorbell';
// ...in main():
let doorBellThing = await WoT.requestThingDescription(DOORBELL_URL);
// In the TD:
events: {
  ...,
  bellRung: {
    title: 'Bell rung',
    description: 'The bell was rung',
    data: { type: 'null' }
  }
}
// Handler:
doorBellThing.subscribeEvent('bellRung', (data) => {
  systemThing.emitEvent('bellRung', data);
});


const ALARM_URL = 'http://localhost:8084/alarm';
// ...in main():
let alarmThing = await WoT.requestThingDescription(ALARM_URL);
// In the TD:
events: {
  ...,
  alarmRinging: {
    title: 'Alarm Ringing',
    description: 'This alarm has started ringing',
    data: { type: 'null' }
  }
}
// Handler:
alarmThing.subscribeEvent('alarmRinging', (data) => {
  systemThing.emitEvent('alarmRinging', data);
});



const HEATER_URL = 'http://localhost:8086/heater';
// ...in main():
let heaterThing = await WoT.requestThingDescription(HEATER_URL);
// In the TD:
actions: {
  ...,
  startHeater: {
    title: 'Start heater',
    description: 'Starts the heater at the given temperature for the given time',
    input: {
      type: 'object',
      properties: {
        temperature: { type: 'integer', description: 'Temperature in °C' },
        timeHeating: { type: 'integer', description: 'Heating time in minutes' }
      }
    }
  }
}
// Handler:
systemThing.setActionHandler('startHeater', proxyActionHandler(heaterThing, 'startHeater'));
```