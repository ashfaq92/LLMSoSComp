import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
import * as utils from '.././utils.js';
import LEDs from './devices/leds.js';
import Speaker from './devices/speaker.js';
import SmartAssistant from './devices/smartAssistant.js';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

const SYSTEM_PORT = 8000;


const leds = new LEDs();
const speaker = new Speaker();
const smartAssistant = new SmartAssistant();



async function main() {
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: SYSTEM_PORT }));
    servient.addClientFactory(new HttpClientFactory());

    const WoT = await servient.start();


    const systemThing = await WoT.produce({
        title: 'SmartHomeSystem',
        description: 'System-level WoT Thing for smart home',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {},
        actions: {
            BlinkLEDs: {
                title: 'Blink LEDs',
                description: 'Blinks LEDs once',
                output: { type: 'string' }
            },
            setVolume: {
                title: "Set volume",
                description: "Sets the volume of this speaker",
                input: {
                    type: "object",
                    properties: {
                        percentage: {
                            type: "integer",
                            description: "The volume percentage to set this speaker to"
                        }
                    }
                },
                output: { type: 'integer' }
            },
            SayCriticalAlert: {
                title: "Say phrase",
                description: "Makes the assistant say the given phrase",
                input: {
                    type: "object",
                    properties: {
                        phrase: {
                            type: "string",
                            description: "The phrase to be spoken by this assistant"
                        }
                    }
                },
            },
            WelcomeHome: {
                title: 'Welcome Home',
                description: 'Workflow: Triggers the Welcome Home workflow in Node-RED'
            },
            handleAlert: {
                title: 'Handle Alert',
                description: 'Workflow: Triggers the critical water alert workflow in Node-RED'
            }
        },
        events: {}
    });

    
    systemThing.setActionHandler('BlinkLEDs', () => leds.blink());
    systemThing.setActionHandler('setVolume', async (input) => {
        const data = await input.value();
        console.log('setVolume data:', data);
        return speaker.setVolume(data);
    });
    systemThing.setActionHandler('SayCriticalAlert', async (input) => {
        const data = await input.value();
        console.log('SayCriticalAlert data:', data);
        return smartAssistant.say(data);
    });

    systemThing.setActionHandler('WelcomeHome', utils.proxyNodeRedActionHandler('http://localhost:1880/WelcomeHome'));
    systemThing.setActionHandler('handleAlert', utils.proxyNodeRedActionHandler('http://localhost:1880/handleAlert'));

    await systemThing.expose();
    console.log(`SmartHomeSystem exposed at http://localhost:${SYSTEM_PORT}/smarthomesystem`);
}

main().catch((err) => {
    console.error('SmartHomeSystem: Fatal error:', err);
    process.exit(1);
});

