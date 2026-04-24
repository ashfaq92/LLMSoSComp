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
    const startedAt = Date.now();

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

        console.log(`[SoS] handleCriticalWaterHealth called with parameter=${parameter}, severity=${severity}`);

        sosState.lastWaterHealthSeverity = severity;

        if (severity !== 'critical') {
            console.log('[SoS] Severity is not critical, no action taken.');
            return;
        }

        console.log(`⚠️  Critical water health detected: ${parameter} (${severity})`);

        // Alert occupant via smart home system
        console.log('[SoS] Invoking homeSystem.triggerAlert...');
        await homeSystem.invokeAction('triggerAlert', {
            message: `Critical aquarium water health detected (${parameter}). Reducing home heating to save energy.`,
            severity: 'critical'
        });

        // Lower non-essential home energy use: reduce heating
        const reducedHeatingTemp = 18;
        console.log(`[SoS] Invoking homeSystem.setHeating to ${reducedHeatingTemp}C for 30 mins...`);
        await homeSystem.invokeAction('setHeating', {
            temperature: reducedHeatingTemp,
            duration_mins: 30
        });
        console.log('Heater set to energy-saving mode.');

        sosState.energySavingMode = true;

        console.log('[SoS] Emitting crossSystemMitigationApplied event...');
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

        console.log(`[SoS] Received waterHealthDegraded event: parameter=${parameter}, severity=${severity}`);

        sosState.lastWaterHealthSeverity = severity;

        if (severity === 'critical') {
            await handleCriticalWaterHealth({ parameter, severity });
        }
    });

    // Subscribe to occupancyStatus changes on the home system
    async function readPropertyValue(thing, propertyName) {
        const output = await thing.readProperty(propertyName);
        if (output && typeof output.value === 'function') {
            try {
                return await output.value();
            } catch (err) {
                // Some endpoints may return wrapped payloads that fail strict schema validation.
                const wrapped = err?.value;
                if (wrapped && typeof wrapped === 'object') {
                    if (typeof wrapped.value === 'string') {
                        return wrapped.value;
                    }
                    if (wrapped.schema && typeof wrapped.schema.value === 'string') {
                        return wrapped.schema.value;
                    }
                    if (typeof wrapped[propertyName] === 'string') {
                        return wrapped[propertyName];
                    }
                }
                throw err;
            }
        }
        return output;
    }

    async function monitorHomeOccupancy() {
        // Polling approach (since WoT does not guarantee property change notifications)
        let lastStatus = await readPropertyValue(homeSystem, 'occupancyStatus');
        setInterval(async () => {
            try {
                const currentStatus = await readPropertyValue(homeSystem, 'occupancyStatus');
                if (currentStatus !== lastStatus) {
                    console.log(`[SoS] Home occupancyStatus changed: ${lastStatus} -> ${currentStatus}`);
                    lastStatus = currentStatus;
                    if (currentStatus === 'away') {
                        console.log('🚪 Occupancy switched to AWAY');
                        // Set aquarium lighting to energy-saving mode
                        console.log('[SoS] Setting aquarium lighting to energy-saving mode...');
                        await aquariumSystem.invokeAction('setLightingProfile', { profile: 'energy-saving' });
                        console.log('Aquarium lighting set to energy-saving mode.');

                        // Pause scheduled feeding in aquarium system.
                        console.log('[SoS] Pausing aquarium scheduled feeding...');
                        await aquariumSystem.invokeAction('pauseFeeding');
                        console.log('Scheduled feeding paused.');
                    }
                }
            } catch (err) {
                console.error('[SoS] Error monitoring occupancyStatus:', err);
            }
        }, 2000); // Poll every 2 seconds
    }

    monitorHomeOccupancy();

    await sosThing.expose();
    console.log(`AquariumHomeSoS exposed at http://localhost:${port}/aquariumhomesos`);
    console.log('[SoS] Waiting for events from SmartAquariumSystem...');

    // Heartbeat to show orchestrator is alive even when no events arrive.
    setInterval(async () => {
        try {
            const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
            const occupancy = await readPropertyValue(homeSystem, 'occupancyStatus');
            console.log(`Heartbeat: orchestrator alive | occupancy=${occupancy} | uptime=${uptimeSeconds}s`);
        } catch (err) {
            console.error('[SoS] Heartbeat read failed:', err.message || err);
        }
    }, 10000);
}

main().catch((err) => {
    console.error('AquariumHomeSoS: Fatal error:', err);
    process.exit(1);
});