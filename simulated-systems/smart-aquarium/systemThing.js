import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

async function getTDsFromTDD(tddUrl = 'http://localhost:9101/things') {
    const { things } = await fetch(tddUrl).then(r => r.json());
    return things; // array of full TDs
}

const port = 9100;
async function main() {
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: port }));
    servient.addClientFactory(new HttpClientFactory());
    const WoT = await servient.start();

    // Fetch all TDs from TDD and consume them
    const devices = {};
    for (const td of await getTDsFromTDD()) {
        devices[td.title?.toLowerCase() || td.deviceName?.toLowerCase()] = await WoT.consume(td);
        console.log(`Consumed: ${td.title || td.deviceName}`);
    }

    // System Thing Description
    const systemThing = await WoT.produce({
        title: 'SmartAquariumSystem',
        description: 'System-level WoT Thing for smart aquarium',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {
            waterHealthStatus: {
                type: "string",
                enum: ["healthy", "warning", "critical"],
                description: "Overall health status of the aquarium water",
                value: "healthy"
            },
            currentPH: {
                type: "number",
                description: "Current pH level of the aquarium",
                value: 7.0
            },
            currentTemperature: {
                type: "number",
                description: "Current temperature of the aquarium",
                value: 25
            },
            currentSalinity: {
                type: "number",
                description: "Current salinity of the aquarium",
                value: 1.020
            },
            foodStorageLevel: {
                type: "string",
                enum: ["full", "low", "empty"],
                description: "Current level of food storage in the feeder",
                value: "full"
            },
            filterStatus: {
                type: "string",
                enum: ["ok", "clogged", "failed"],
                description: "Status of the aquarium filter",
                value: "ok"
            },
            powerStatus: {
                type: "string",
                enum: ["mains", "backup", "outage"],
                description: "Current power supply status",
                value: "mains"
            }
        },
        actions: {
            regulatePH: {
                description: "Adds coral or CO2 to bring pH to target range"
            },
            regulateTemperature: {
                description: "Activates heater or cooler to reach optimum temperature"
            },
            regulateSalinity: {
                description: "Adds salt to restore salinity to required level"
            },
            regulateNitrate: {
                description: "Adds potassium nitrate to restore nitrate level"
            },
            dispenseFood: {
                description: "Manually triggers food dispenser"
            },
            setLightingProfile: {
                description: "Sets lighting schedule to simulate natural light conditions",
                input: { type: "object", properties: { profile: { type: "string" } } }
            },
            scheduleMaintenanceTask: {
                description: "Schedules a maintenance task",
                input: { type: "object", properties: { task: { type: "string" }, due_date: { type: "string" } } }
            },
            switchToBackupPower: {
                description: "Activates backup power supply"
            }
        },
        events: {
            waterHealthDegraded: {
                description: "Emitted when water health degrades below acceptable thresholds",
                data: {
                    type: "object",
                    properties: {
                        parameter: { type: "string" },
                        severity: { type: "string" }
                    }
                }
            },
            foodStorageLow: {
                description: "Emitted when the food storage in the feeder is running low"
            },
            filterAlert: {
                description: "Emitted when the filter is clogged or failed"
            },
            powerOutageDetected: {
                description: "Emitted when a power outage or backup power is detected"
            },
            abnormalBehaviorDetected: {
                description: "Emitted when abnormal behavior is detected in the aquarium"
            }
        }
    });

    // ACTIONS

    // Regulate pH
    systemThing.setActionHandler("regulatePH", async () => {
        // Example: try to bring pH to 7.0
        if (devices.tankactuators && devices.tanksensors) {
            const pH = await devices.tanksensors.readProperty('pHLevel');
            if (pH < 6.5) {
                await devices.tankactuators.invokeAction('dispenseChemical', { chemical: 'crushed coral', amount: 10 });
            } else if (pH > 7.5) {
                await devices.tankactuators.invokeAction('dispenseChemical', { chemical: 'CO2', amount: 10 });
            }
        }
    });

    // Regulate Temperature
    systemThing.setActionHandler("regulateTemperature", async () => {
        if (devices.tankactuators && devices.tanksensors) {
            const temp = await devices.tanksensors.readProperty('temperature');
            if (temp < 24) {
                await devices.tankactuators.invokeAction('heaterOn', 25);
            } else if (temp > 26) {
                await devices.tankactuators.invokeAction('coolerOn', 25);
            }
        }
    });

    // Regulate Salinity
    systemThing.setActionHandler("regulateSalinity", async () => {
        if (devices.tankactuators && devices.tanksensors) {
            const salinity = await devices.tanksensors.readProperty('salinity');
            if (salinity < 1.018) {
                await devices.tankactuators.invokeAction('dispenseChemical', { chemical: 'salt', amount: 5 });
            }
        }
    });

    // Regulate Nitrate
    systemThing.setActionHandler("regulateNitrate", async () => {
        if (devices.tankactuators && devices.tanksensors) {
            const nitrate = await devices.tanksensors.readProperty('nitrateLevel');
            if (nitrate < 10) {
                await devices.tankactuators.invokeAction('dispenseChemical', { chemical: 'potassium nitrate', amount: 5 });
            }
        }
    });

    // Dispense Food
    systemThing.setActionHandler("dispenseFood", async () => {
        if (devices.fooddispensor) {
            await devices.fooddispensor.invokeAction('dispenseFood', 10); // or desired amount
        }
    });

    // Set Lighting Profile
    systemThing.setActionHandler("setLightingProfile", async (params) => {
        if (devices.tanklighting && params && params.profile) {
            await devices.tanklighting.invokeAction('setProfile', { profile: params.profile });
        }
    });

    // Schedule Maintenance Task
    systemThing.setActionHandler("scheduleMaintenanceTask", async (params) => {
        if (devices.scheduler && params && params.task && params.due_date) {
            await devices.scheduler.invokeAction('scheduleTask', { task: params.task, due_date: params.due_date });
        }
    });

    // Switch to Backup Power
    systemThing.setActionHandler("switchToBackupPower", async () => {
        if (devices.backuppower) {
            await devices.backuppower.invokeAction('activate');
            await systemThing.writeProperty('powerStatus', 'backup');
        }
    });


    // EVENT SUBSCRIPTIONS

    // Example: Water health degraded (pH, temperature, salinity out of range)
    if (devices.tanksensors) {
        devices.tanksensors.subscribeEvent('pHLevel', async (eventData) => {
            const payload = await eventData.value();
            const pH = payload?.pHLevel;
            if (typeof pH === 'number') {
                if (pH < 6.5 || pH > 7.5) {
                    await systemThing.emitEvent('waterHealthDegraded', {
                        parameter: 'pH',
                        severity: (pH < 6.0 || pH > 8.0) ? 'critical' : 'warning'
                    });
                }
            }
        });

        devices.tanksensors.subscribeEvent('temperature', async (eventData) => {
            const payload = await eventData.value();
            const temp = payload?.temperature;
            if (typeof temp === 'number') {
                if (temp < 24 || temp > 26) {
                    await systemThing.emitEvent('waterHealthDegraded', {
                        parameter: 'temperature',
                        severity: (temp < 22 || temp > 28) ? 'critical' : 'warning'
                    });
                }
            }
        });

        devices.tanksensors.subscribeEvent('salinity', async (eventData) => {
            const payload = await eventData.value();
            const salinity = payload?.salinity;
            if (typeof salinity === 'number') {
                if (salinity < 1.018 || salinity > 1.025) {
                    await systemThing.emitEvent('waterHealthDegraded', {
                        parameter: 'salinity',
                        severity: (salinity < 1.015 || salinity > 1.030) ? 'critical' : 'warning'
                    });
                }
            }
        });
    }

    // Food storage low (already handled in your code, but for event with no data:)
    if (devices.fooddispensor) {
        devices.fooddispensor.subscribeEvent('lowFoodLevel', async () => {
            await systemThing.emitEvent('foodStorageLow');
        });
    }

    // Filter alert (emit when filter status is not ok)
    if (devices.filtermonitor) {
        devices.filtermonitor.subscribeEvent('filterIssue', async () => {
            await systemThing.emitEvent('filterAlert');
        });
    }

    // Power outage detected (emit when power status is backup or outage)
    if (devices.outagedetector) {
        devices.outagedetector.subscribeEvent('powerOutage', async () => {
            await systemThing.emitEvent('powerOutageDetected');
        });
    }

    // Abnormal behavior detected (example: sensor out of bounds or device error)
    if (devices.tanksensors) {
        devices.tanksensors.subscribeEvent('temperature', async (eventData) => {
            const payload = await eventData.value();
            const temp = payload?.temperature;
            if (typeof temp === 'number' && (temp < 10 || temp > 40)) {
                await systemThing.emitEvent('abnormalBehaviorDetected');
            }
        });
    }

    await systemThing.expose();
    console.log(`SmartAquariumSystem exposed at http://localhost:${port}/smartaquariumsystem`);
}

main().catch((err) => {
    console.error('SmartAquariumSystem: Fatal error:', err);
    process.exit(1);
});
