# Simulated WoT Devices

This smart home project contains simulated Web of Things (WoT) devices for testing and development purposes. 

## Prerequisites

- Node.js 20+

## Installation

```bash
cd smart-home
npm install
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
