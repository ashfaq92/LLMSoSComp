import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
import * as utils from '../utils.js';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

const SYSTEM_PORT = 9100;
const TDD_PATH = './TDD.json';

// Get device URLs
const TANK_LIGHTING_URL = utils.getDeviceUrl(TDD_PATH, 'tankLighting');
// Add more devices as needed, e.g.:
// const TANK_SENSORS_URL = utils.getDeviceUrl(TDD_PATH, 'tankSensors');

async function main() {
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: SYSTEM_PORT }));
    servient.addClientFactory(new HttpClientFactory());

    const WoT = await servient.start();

    // DRY: Consume device Things
    const tankLightingThing = await utils.consumeThing(WoT, TANK_LIGHTING_URL, 'tankLighting');
    // const tankSensorsThing = await utils.consumeThing(WoT, TANK_SENSORS_URL, 'tankSensors');

    const systemThing = await WoT.produce({
        title: 'SmartAquariumSystem',
        description: 'System-level WoT Thing for smart aquarium',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {},
        actions: {
            alterLightingProfile: {
                title: 'Alter Lighting Profile',
                description: 'Alters the profile of the tank lighting',
                input: { type: 'string' },
                output: {
                    type: "string",
                    description: "The applied lighting profile"
                }
            },
            HandleCriticalWaterAlert: {
                title: 'Handle Critical Water Alert',
                description: 'Workflow: Triggers the critical water alert workflow in Node-RED',
                output: {
                    type: "string",
                    description: "The message returned by the alert handling workflow"
                }
            }
        },
        events: {}
    });

    // Set action handlers
    systemThing.setActionHandler('alterLightingProfile', utils.proxyActionHandler(tankLightingThing, 'alterLightingProfile'));
    systemThing.setActionHandler('HandleCriticalWaterAlert', utils.proxyNodeRedActionHandler('http://localhost:1880/HandleCriticalWaterAlert'));

    await systemThing.expose();
    console.log(`SmartAquariumSystem exposed at http://localhost:${SYSTEM_PORT}/smartaquariumsystem`);
}

main().catch((err) => {
    console.error('SmartAquariumSystem: Fatal error:', err);
    process.exit(1);
});