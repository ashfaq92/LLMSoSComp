# Introduction

Both `flatWoT` and `holonicWoT` implement two SoS-level (System of Systems) goals. 
These goals are designed to require the combined capabilities of devices from both the `smart-home` and `smart-aquarium` systems.

The `flatWoT` approach achieves these goals by directly accessing the IoT devices' Thing Descriptions (TDs) and orchestrating them to fulfill SoS-level objectives.

In contrast, the `holonicWoT` approach first generates a `systemThing` for each individual system (`smart-home` and `smart-aquarium`). Each `systemThing` is intentionally designed to achieve sub-goals that contribute to the overall SoS-level goals. 


# Implemented SoS Goals

- When aquarium water health degrades to a critical level, alert the home occupant and reduce non-essential home energy use (e.g., lower heating).
- When home occupancy switches to "away", set aquarium lighting to energy-saving mode and pause scheduled feeding.



# Experiment Tasks

## Implement New SoS Goals

Implement at least one new SoS-level goal in both `flatWoT` and `holonicWoT`. You may implement more if you wish.

- For `flatWoT`, examine the relevant TDs from `smart-home` and `smart-aquarium` and orchestrate them directly to achieve the SoS-level goal.
- For `holonicWoT`, break the new SoS goal into sub-goals and implement them within the respective `systemThing` of each system. Then, orchestrate these sub-goals in `holonicWoT`.

You may use any coding tools, including LLMs, but ensure you use the same settings for both approaches (`flatWoT` and `holonicWoT`).

You can choose from the following sample goals, or define your own:

- When a power outage is detected in the aquarium, trigger a home alert and switch the aquarium to backup power.
- Morning routine coordination: when the morning alarm triggers at home, also set aquarium lighting to the daytime profile.
- If abnormal fish behavior is detected, alert the home occupant and log a maintenance task in the aquarium system.

Record your experiences in natural language: note any differences you observed, which approach felt easier, etc.

## Maintenance Test

- Simulate device replacement:
  - Swap one device (e.g., replace the speaker with a different model or TD).
  - Count how many files and lines break in flatWoT vs holonicWoT.


