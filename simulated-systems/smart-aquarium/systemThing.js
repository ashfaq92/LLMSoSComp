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
        description: 'System-level WoT Thing for smart aquarium (goal-focused)',
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
            }
        },
        actions: {
            setLightingProfile: {
                description: "Sets lighting schedule to simulate natural light conditions",
                input: { type: "object", properties: { profile: { type: "string" } } }
            },
            pauseFeeding: {
                description: "Pauses scheduled aquarium feeding"
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
            }
        }
    });

    // ACTIONS

    // Set Lighting Profile
    systemThing.setActionHandler("setLightingProfile", async (params) => {
        if (devices.tanklighting && params && params.profile) {
            await devices.tanklighting.invokeAction('setProfile', { profile: params.profile });
        }
    });

    // Pause Feeding
    systemThing.setActionHandler("pauseFeeding", async () => {
        if (devices.scheduler) {
            await devices.scheduler.invokeAction('scheduleTask', { role: 'aquarium', task: 'pause_feeding' });
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

    await systemThing.expose();
    console.log(`SmartAquariumSystem exposed at http://localhost:${port}/smartaquariumsystem`);
}

main().catch((err) => {
    console.error('SmartAquariumSystem: Fatal error:', err);
    process.exit(1);
});
