// ManufacturingSystem Thing: proxies processSensorData to SensorHub
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

const SYSTEM_PORT = 9010;
const SENSORHUB_URL = 'http://localhost:9007/sensorhub';

async function main() {
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: SYSTEM_PORT }));
    servient.addClientFactory(new HttpClientFactory());

    const WoT = await servient.start();

    // Consume SensorHub Thing
    let sensorHubThing;
    try {
        sensorHubThing = await WoT.requestThingDescription(SENSORHUB_URL);
        console.log('ManufacturingSystem: Consumed SensorHub at', SENSORHUB_URL);
    } catch (err) {
        console.error('ManufacturingSystem: Failed to consume SensorHub:', err);
        process.exit(1);
    }

    // Define system-level Thing
    const systemThing = await WoT.produce({
        title: 'ManufacturingSystem',
        description: 'System-level WoT Thing for manufacturing',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {},
        actions: {
            processSensorData: {
                title: 'Process sensor data',
                description: 'Process sensor data for a named sensor',
                input: {
                    type: 'object',
                    properties: {
                        sensorName: { type: 'string', description: 'The name of the sensor' },
                        data: { type: 'string', description: 'The data for the sensor' }
                    },
                    required: ['sensorName', 'data']
                }
            }
        },
        events: {}
    });

    // Proxy handler for processSensorData
    systemThing.setActionHandler('processSensorData', async (input) => {
        try {
            // Validate input shape
            if (!input || typeof input.sensorName !== 'string' || typeof input.data !== 'string') {
                throw new Error('Invalid input: must provide { sensorName: string, data: string }');
            }
            // Forward to SensorHub (internal detail, not exposed to user)
            await sensorHubThing.invokeAction('processSensorData', input);
            return { status: 'ok' };
        } catch (err) {
            console.error('ManufacturingSystem: processSensorData failed:', err);
            return { status: 'error', error: err.message || String(err) };
        }
    });

    await systemThing.expose();
    console.log(`ManufacturingSystem exposed at http://localhost:${SYSTEM_PORT}/manufacturingsystem`);
}

main().catch((err) => {
    console.error('ManufacturingSystem: Fatal error:', err);
    process.exit(1);
});