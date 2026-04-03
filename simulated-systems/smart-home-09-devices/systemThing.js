import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
import { getDeviceUrlFromTDD, proxyActionHandler, proxyNodeRedActionHandler } from '.././utils.js';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

const SYSTEM_PORT = 8000;

// Read LEDs URL from TDD.json by deviceName using helper
const TDD_PATH = './TDD.json';
let LEDS_URL = null;
try {
    LEDS_URL = getDeviceUrlFromTDD(TDD_PATH, 'leds');
} catch (err) {
    console.error(err.message);
    process.exit(1);
}

async function main() {
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: SYSTEM_PORT }));
    servient.addClientFactory(new HttpClientFactory());

    const WoT = await servient.start();

    // Consume LEDs Thing
    let ledsThing;
    try {
        // ledsThing = await WoT.requestThingDescription(LEDS_URL);
        const td = await WoT.requestThingDescription(LEDS_URL);
        ledsThing = await WoT.consume(td);
        console.log('SmartHomeSystem: Consumed LEDs at', LEDS_URL);
    } catch (err) {
        console.error('SmartHomeSystem: Failed to consume LEDs:', err);
        process.exit(1);
    }

    // Define system-level Thing
    const systemThing = await WoT.produce({
        title: 'SmartHomeSystem',
        description: 'System-level WoT Thing for smart home',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {},
        actions: {
            LEDsOn: {
                title: 'Turn LEDs on',
                description: 'Turns on the LEDs'
            },
            LEDsOff: {
                title: 'Turn LEDs off',
                description: 'Turns off the LEDs'
            },
            WelcomeHome: {
                title: 'Welcome Home',
                description: 'Triggers the Welcome Home workflow in Node-RED'
            }
        },
        events: {}
    });

    // Use the generic proxy helper for both actions
    systemThing.setActionHandler('LEDsOn', proxyActionHandler(ledsThing, 'LEDsOn'));
    systemThing.setActionHandler('LEDsOff', proxyActionHandler(ledsThing, 'LEDsOff'));
    systemThing.setActionHandler('WelcomeHome', proxyNodeRedActionHandler('http://localhost:1880/WelcomeHome'));

    await systemThing.expose();
    console.log(`SmartHomeSystem exposed at http://localhost:${SYSTEM_PORT}/smarthomesystem`);
}

main().catch((err) => {
    console.error('SmartHomeSystem: Fatal error:', err);
    process.exit(1);
});