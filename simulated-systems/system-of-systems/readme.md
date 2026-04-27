# Introduction

`flatWoT` and `holonicWoT` are two approaches for implementing SoS-level goals.
These SoS goals require the combined capabilities of devices from both the `smart-home` and `smart-aquarium` systems.

In the `flatWoT` approach, a programmer implements these goals by directly accessing the IoT devices' Thing Descriptions (TDs) and orchestrating them.

In the `holonicWoT` approach, the programmer breaks overall SoS-level goals into sub-goals for each individual system (`smart-home` and `smart-aquarium`), writes a `systemThing` for each system to implement these sub-goals, and then orchestrates the affordances of each `systemThing` to achieve the SoS-level goals.


# Implemented SoS Goals

So far, the following two goals have been implemented in both `flatWoT.js` and `holonicWoT.js`:

- When aquarium water health degrades to a critical level, alert the home occupant and reduce non-essential home energy use (e.g., lower heating).
- When home occupancy switches to "away", set aquarium lighting to energy-saving mode and pause scheduled feeding.


# Empirical Studies



## Experiment: Simulated device replacement ✅

- Swapped `smart-home heater` with a `SmartThermostat` that has a completely different action signature.
- Heater was chosen because it appears in both flat WoT (`heater.invokeAction('startHeater', { temperature, timeHeating })`) and holonic home systemThing internals. 

**Original Heater TD:**

```json
{
  "title": "Heater",
  "actions": {
    "startHeater": {
      "input": {
        "type": "object",
        "properties": {
          "temperature": { "type": "number" },
          "timeHeating": { "type": "number" }
        }
      }
    }
  }
}
```

**Replacement SmartThermostat TD:**
```json
{
  "title": "SmartThermostat",
  "description": "A smart thermostat replacing the old heater",
  "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
  "@type": ["Thing"],
  "securityDefinitions": { "no_sec": { "scheme": "nosec" } },
  "security": ["no_sec"],
  "actions": {
    "setTemperature": {
      "description": "Set target temperature and duration in seconds",
      "input": {
        "type": "object",
        "properties": {
          "targetCelsius": { "type": "number" },
          "durationSeconds": { "type": "integer" }
        },
        "required": ["targetCelsius", "durationSeconds"]
      }
    }
  }
}
```


**Results:**

- In `flatWoT.js`, 3-4 lines need to be changed:
    - The TD URL changes → line 6 must change
    - `heater.invokeAction('startHeater', { temperature: 16, timeHeating: 10 })` breaks → must become `smartThermostat.invokeAction('setTemperature', { targetCelsius: 16, durationSeconds: 600 })`
    - The `const heater = await WoT.consume(...)` line changes
- In `holonicWoT.js`, 2 lines change, none in the SoS file:
    - The TD URL in the home systemThing changes → 1 line
    - `devices.heater.invokeAction('startHeater', ...)` in `setHeating` handler changes → 1 line
    - `sosThing.js` (the SoS orchestrator): **zero lines change**
- `git diff --shortstat`: 
  - flatWoT: 2 files changed, 22 insertions(+), 24 deletions(-)
  - holonicWoT:  2 files changed, 20 insertions(+), 22 deletions(-)

## Experiment: Implementing New SoS Goals

Implement at least one new SoS-level goal in both `flatWoT` and `holonicWoT`. You may implement more if you wish.

- For `flatWoT`, examine the relevant TDs from `smart-home` and `smart-aquarium` and orchestrate them directly to achieve the SoS-level goal.
- For `holonicWoT`, break the new SoS goal into sub-goals and implement them within the respective `systemThing` of each system. Then, orchestrate these sub-goals in `holonicWoT`.

You can choose from the following sample goals, or define your own:

- Morning routine coordination: when the morning alarm triggers at home, also set aquarium lighting to the daytime profile.
- When a power outage is detected in the aquarium, trigger a home alert and switch the aquarium to backup power.
- If abnormal fish behavior is detected, alert the home occupant and log a maintenance task in the aquarium system.

You may use any coding tools, including LLMs, but ensure you use the same settings for both approaches (`flatWoT` and `holonicWoT`).

### Measurements

- Count how many TDs a programmer needs to read and understand to implement each SoS goal. 
- How many files/lines need to be changed for each approach after implementing each SoS goal.
- Record time for each appraoch
- Record your experiences in natural language, i.e., note any differences you observed, which approach felt easier, and so on.
- OOP metrics: Coupling/cohesion (CBO, LCOM)?
- Other?




## Other?

- Error rate
- Complexity
- OOP metrics: Coupling/cohesion (CBO, LCOM)?