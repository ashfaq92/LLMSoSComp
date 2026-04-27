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

## Experiment 1: Implementing New SoS Goals

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

## Simulate device replacement

- Swap one device (e.g., replace the speaker with a different model or TD).

  
### Measurements

- Count how many files and lines break in `flatWoT` vs. `holonicWoT`.
- How many files/lines need to be changed for each approach after replacing each device.
- Record your experiences in natural language, i.e., note any differences you observed, which approach felt easier, and so on.
- OOP metrics: Coupling/cohesion (CBO, LCOM)?
- Other?


## Quantitative Evaluation Metrics

- Error rate
- Complexity