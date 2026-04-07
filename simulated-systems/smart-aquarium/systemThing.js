import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
import * as utils from '../utils.js';
import TankLighting from './devices/tankLighting.js';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const SYSTEM_PORT = 9100;

const tankLighting = new TankLighting();

async function main() {
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: SYSTEM_PORT }));

    const WoT = await servient.start();

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
                output: { type: "string" }
            },
            HandleCriticalWaterAlert: {
                title: 'Handle Critical Water Alert',
                description: 'Workflow: Triggers the critical water alert workflow in Node-RED',
                output: { type: "string" }
            }
        },
        events: {}
    });

    systemThing.setActionHandler('alterLightingProfile', async (input) => {
        const value = await input.value();
        return tankLighting.alterLightingProfile(value);
    });

    // Node-RED workflow
    systemThing.setActionHandler('HandleCriticalWaterAlert', utils.proxyNodeRedActionHandler('http://localhost:1880/HandleCriticalWaterAlert'));

    await systemThing.expose();
    console.log(`SmartAquariumSystem exposed at http://localhost:${SYSTEM_PORT}/smartaquariumsystem`);
}

main().catch((err) => {
    console.error('SmartAquariumSystem: Fatal error:', err);
    process.exit(1);
});