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
                description: "Overall health status of the aquarium water"
            },
            currentPH: {
                type: "number",
                description: "Current pH level of the aquarium"
            },
            currentTemperature: {
                type: "number",
                description: "Current temperature of the aquarium"
            },
            currentSalinity: {
                type: "number",
                description: "Current salinity of the aquarium"
            },
            foodStorageLevel: {
                type: "string",
                enum: ["full", "low", "empty"],
                description: "Current level of food storage in the feeder"
            },
            filterStatus: {
                type: "string",
                enum: ["ok", "clogged", "failed"],
                description: "Status of the aquarium filter"
            },
            powerStatus: {
                type: "string",
                enum: ["mains", "backup", "outage"],
                description: "Current power supply status"
            }
        },
        actions: {},
        events: {
            pHRegulationAction: {
                description: "Emitted when a pH regulation action is performed (crushed coral or CO2 added)",
                data: { type: "object" }
            },
            temperatureRegulationAction: {
                description: "Emitted when a temperature regulation action is performed (heater or cooler used)",
                data: { type: "object" }
            },
            salinityRegulationAction: {
                description: "Emitted when a salinity regulation action is performed (salt added)",
                data: { type: "object" }
            },
            nitrateRegulationAction: {
                description: "Emitted when a nitrate regulation action is performed (potassium nitrate added)",
                data: { type: "object" }
            },
            feedingAction: {
                description: "Emitted when an automated feeding is performed",
                data: { type: "object" }
            },
            foodStorageLow: {
                description: "Emitted when the food storage in the feeder is running low",
                data: { type: "object" }
            },
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

    await systemThing.writeProperty("waterHealthStatus", "healthy");
    await systemThing.writeProperty("currentPH", 7.0);
    await systemThing.writeProperty("currentTemperature", 25);
    await systemThing.writeProperty("currentSalinity", 1.020);
    await systemThing.writeProperty("foodStorageLevel", "full");
    await systemThing.writeProperty("filterStatus", "ok");
    await systemThing.writeProperty("powerStatus", "mains");

    // Orchestrate pH regulation workflow
    if (devices.tanksensors && devices.tankactuators) {
        devices.tanksensors.subscribeEvent('pHLevel', async (eventData) => {
            // node-wot passes an InteractionOutput object, so extract the value
            const payload = await eventData.value();
            let pH = undefined;
            if (payload && typeof payload === 'object' && 'pHLevel' in payload) {
                pH = payload.pHLevel;
            }
            // console.log('Received pHLevel event:', pH);

            const minPH = 6.5;
            const maxPH = 7.5;
            let action = null;
            let result = null;
            if (typeof pH === 'number') {
                if (pH < minPH) {
                    // Too acidic, add crushed coral
                    action = { chemical: 'crushed coral', amount: 10 };
                    result = await devices.tankactuators.invokeAction('dispenseChemical', action);
                    // console.log(`pH ${pH} < ${minPH}: Dispensing crushed coral`, result);
                } else if (pH > maxPH) {
                    // Too alkaline, add CO2
                    action = { chemical: 'CO2', amount: 10 };
                    result = await devices.tankactuators.invokeAction('dispenseChemical', action);
                    // console.log(`pH ${pH} > ${maxPH}: Dispensing CO2`, result);
                }
                if (action) {
                    await systemThing.emitEvent('pHRegulationAction', {
                        message: `pH regulation performed: ${action.chemical}`,
                        action,
                        result,
                        measuredPH: pH,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[systemThing] pHRegulationAction event fired`)
                }
            }
        });
    }


    if (devices.tanksensors && devices.tankactuators) {
        devices.tanksensors.subscribeEvent('temperature', async (eventData) => {
            // console.log('[systemThing] temperature eventData:', eventData);
            let payload;
            try {
                payload = await eventData.value();
            } catch (e) {
                console.error('[systemThing] Failed to extract value from eventData:', e);
                return;
            }
            // console.log('[systemThing] temperature payload:', payload);

            let temp = undefined;
            if (payload && typeof payload === 'object' && 'temperature' in payload) {
                temp = payload.temperature;
            }
            // console.log('[systemThing] Extracted temperature:', temp);

            const minTemp = 24;
            const maxTemp = 26;
            let action = null;
            let result = null;
            if (typeof temp === 'number') {
                if (temp < minTemp) {
                    // Too cold, turn on heater to 25°C
                    action = { type: 'heaterOn', value: 25 };
                    result = await devices.tankactuators.invokeAction('heaterOn', 25);
                    // console.log(`[systemThing] Invoked heaterOn(25):`, result);
                } else if (temp > maxTemp) {
                    // Too hot, turn on cooler to 25°C
                    action = { type: 'coolerOn', value: 25 };
                    result = await devices.tankactuators.invokeAction('coolerOn', 25);
                    // console.log(`[systemThing] Invoked coolerOn(25):`, result);
                }
                if (action) {
                    await systemThing.emitEvent('temperatureRegulationAction', {
                        message: `Temperature regulation performed: ${action.type} to ${action.value}°C`,
                        action,
                        result,
                        measuredTemperature: temp,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[systemThing] temperatureRegulationAction event fired`);
                }
            } else {
                console.log('[systemThing] Temperature value not a number:', temp);
            }
        });
    }


    // Orchestrate salinity regulation workflow
    if (devices.tanksensors && devices.tankactuators) {
        devices.tanksensors.subscribeEvent('salinity', async (eventData) => {
            let payload;
            try {
                payload = await eventData.value();
            } catch (e) {
                console.error('[systemThing] Failed to extract value from salinity eventData:', e);
                return;
            }
            let salinity = undefined;
            if (payload && typeof payload === 'object' && 'salinity' in payload) {
                salinity = payload.salinity;
            }
            const minSalinity = 1.018;
            let action = null;
            let result = null;
            if (typeof salinity === 'number' && salinity < minSalinity) {
                action = { chemical: 'salt', amount: 5 };
                result = await devices.tankactuators.invokeAction('dispenseChemical', action);
                await systemThing.emitEvent('salinityRegulationAction', {
                    message: `Salinity regulation performed: added salt`,
                    action,
                    result,
                    measuredSalinity: salinity,
                    timestamp: new Date().toISOString()
                });
                console.log(`[systemThing] salinityRegulationAction event fired`);
            }
        });
    }

    // Orchestrate nitrate regulation workflow
    if (devices.tanksensors && devices.tankactuators) {
        devices.tanksensors.subscribeEvent('nitrateLevel', async (eventData) => {
            let payload;
            try {
                payload = await eventData.value();
            } catch (e) {
                console.error('[systemThing] Failed to extract value from nitrateLevel eventData:', e);
                return;
            }
            let nitrate = undefined;
            if (payload && typeof payload === 'object' && 'nitrateLevel' in payload) {
                nitrate = payload.nitrateLevel;
            }
            const minNitrate = 10;
            let action = null;
            let result = null;
            if (typeof nitrate === 'number' && nitrate < minNitrate) {
                action = { chemical: 'potassium nitrate', amount: 5 };
                result = await devices.tankactuators.invokeAction('dispenseChemical', action);
                await systemThing.emitEvent('nitrateRegulationAction', {
                    message: `Nitrate regulation performed: added potassium nitrate`,
                    action,
                    result,
                    measuredNitrate: nitrate,
                    timestamp: new Date().toISOString()
                });
                console.log(`[systemThing] nitrateRegulationAction event fired`);
            }
        });
    }

    // Automated feeding at scheduled times
    if (devices.scheduler && devices.fooddispensor) {
        devices.scheduler.subscribeEvent('feedTime', async (eventData) => {
            let payload;
            try {
                payload = await eventData.value();
            } catch (e) {
                console.error('[systemThing] Failed to extract value from feedTime eventData:', e);
                return;
            }
            // Optionally, extract amount or use a default
            const amount = (payload && payload.amount) ? payload.amount : 10;
            const result = await devices.fooddispensor.invokeAction('dispenseFood', amount);
            await systemThing.emitEvent('feedingAction', {
                message: `Automated feeding performed: dispensed ${amount} units`,
                amount,
                result,
                timestamp: new Date().toISOString()
            });
            console.log(`[systemThing] feedingAction event fired`, { amount, result });
        });
    }

    // Alert owner if food storage is low
    if (devices.fooddispensor && devices.alertsystem) {
        devices.fooddispensor.subscribeEvent('storageLow', async (eventData) => {
            let payload;
            try {
                payload = await eventData.value();
            } catch (e) {
                console.error('[systemThing] Failed to extract value from storageLow eventData:', e);
                return;
            }
            await devices.alertsystem.invokeAction('sendAlert', { message: 'Food storage in feeder is running low!' });
            await systemThing.emitEvent('foodStorageLow', {
                message: 'Food storage in feeder is running low!',
                details: payload,
                timestamp: new Date().toISOString()
            });
            console.log(`[systemThing] foodStorageLow event fired`, payload);
        });
    }

    await systemThing.expose();
    console.log(`SmartAquariumSystem exposed at http://localhost:${port}/smartaquariumsystem`);
}

main().catch((err) => {
    console.error('SmartAquariumSystem: Fatal error:', err);
    process.exit(1);
});

