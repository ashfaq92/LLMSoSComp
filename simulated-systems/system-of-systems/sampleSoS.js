import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

// Subsystems are expected to run as separate processes.

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function consumeThingWithRetry(WoT, tdUrl, retries = 20, waitMs = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            const td = await fetch(tdUrl).then(r => {
                if (!r.ok) {
                    throw new Error(`TD fetch failed (${r.status})`);
                }
                return r.json();
            });
            return await WoT.consume(td);
        } catch (err) {
            if (i === retries - 1) throw err;
            await sleep(waitMs);
        }
    }
    throw new Error(`Unable to consume Thing at ${tdUrl}`);
}

async function main() {
    const servient = new Servient();
    const port = 9200;

    servient.addServer(new HttpServer({ port: port }));
    servient.addClientFactory(new HttpClientFactory());

    const WoT = await servient.start();

    // Consume subsystem system-level Things
    const aquariumSystem = await consumeThingWithRetry(WoT, 'http://localhost:9100/smartaquariumsystem');
    const homeSystem = await consumeThingWithRetry(WoT, 'http://localhost:8100/smarthomething');

    console.log('Consumed: SmartAquariumSystem');
    console.log('Consumed: SmartHomeThing');

    // SoS Thing Description
    const sosThing = await WoT.produce({
        title: 'AquariumHomeSoS',
        description: 'System-of-systems Thing that coordinates aquarium and smart home behaviors',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {
            lastWaterHealthSeverity: {
                type: 'string',
                enum: ['none', 'warning', 'critical'],
                description: 'Most recent observed water-health severity from aquarium system',
                value: 'none'
            },
            energySavingMode: {
                type: 'boolean',
                description: 'Whether home is currently in reduced non-essential energy mode',
                value: false
            }
        },
        actions: {
            handleCriticalWaterHealth: {
                description: 'Alert home occupant and lower heating when aquarium water health is critical',
                input: {
                    type: 'object',
                    properties: {
                        parameter: { type: 'string' },
                        severity: { type: 'string' }
                    }
                }
            }
        },
        events: {
            crossSystemMitigationApplied: {
                description: 'Emitted when SoS applies home-side mitigation for aquarium critical health',
                data: {
                    type: 'object',
                    properties: {
                        parameter: { type: 'string' },
                        severity: { type: 'string' },
                        targetHeating: { type: 'number' }
                    }
                }
            }
        }
    });

    // Keep local property state because produced Thing may not provide writeProperty().
    const sosState = {
        lastWaterHealthSeverity: 'none',
        energySavingMode: false
    };
    sosThing.setPropertyReadHandler('lastWaterHealthSeverity', async () => sosState.lastWaterHealthSeverity);
    sosThing.setPropertyReadHandler('energySavingMode', async () => sosState.energySavingMode);

    const handleCriticalWaterHealth = async (params) => {
        const severity = params?.severity || 'warning';
        const parameter = params?.parameter || 'unknown';

        sosState.lastWaterHealthSeverity = severity;

        if (severity !== 'critical') {
            return;
        }

        // Alert occupant via smart home system
        await homeSystem.invokeAction('triggerAlert', {
            message: `Critical aquarium water health detected (${parameter}). Reducing home heating to save energy.`,
            severity: 'critical'
        });

        // Lower non-essential home energy use: reduce heating
        const reducedHeatingTemp = 18;
        await homeSystem.invokeAction('setHeating', {
            temperature: reducedHeatingTemp,
            duration_mins: 30
        });

        sosState.energySavingMode = true;

        await sosThing.emitEvent('crossSystemMitigationApplied', {
            parameter,
            severity,
            targetHeating: reducedHeatingTemp
        });
    };

    // Action: handleCriticalWaterHealth
    sosThing.setActionHandler('handleCriticalWaterHealth', handleCriticalWaterHealth);

    // Listen to aquarium system degraded-water event and orchestrate home response
    aquariumSystem.subscribeEvent('waterHealthDegraded', async (eventData) => {
        const payload = await eventData.value();
        const severity = payload?.severity || 'warning';
        const parameter = payload?.parameter || 'unknown';

        sosState.lastWaterHealthSeverity = severity;

        if (severity === 'critical') {
            await handleCriticalWaterHealth({ parameter, severity });
        }
    });

    await sosThing.expose();
    console.log(`AquariumHomeSoS exposed at http://localhost:${port}/aquariumhomesos`);
}

main().catch((err) => {
    console.error('AquariumHomeSoS: Fatal error:', err);
    process.exit(1);
});