import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

async function getTDsFromTDD(tddUrl = 'http://localhost:8101/things') {
    const { things } = await fetch(tddUrl).then(r => r.json());
    return things; // array of full TDs
}

async function main() {
    const servient = new Servient();
    const port = 8100;
    servient.addServer(new HttpServer({ port: port }));
    servient.addClientFactory(new HttpClientFactory());
    const WoT = await servient.start();

    // Fetch all TDs from TDD and consume them
    const devices = {};
    for (const td of await getTDsFromTDD()) {
        devices[td.title.toLowerCase()] = await WoT.consume(td);
        console.log(`Consumed: ${td.title}`);
    }


    // System Thing Description
    const systemThing = await WoT.produce({
        title: 'SmartHomeThing',
        description: 'System-level WoT Thing for smart home (goal-focused)',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {
            occupancyStatus: {
                type: "string",
                enum: ["home", "away"],
                description: "Current occupancy status of the home",
                value: "home"
            }
        },
        actions: {
            triggerAlert: {
                description: "General occupant alert via assistant + LEDs",
                input: { type: "object", properties: { message: { type: "string" }, severity: { type: "string" } } }
            },
            setHeating: {
                description: "Sets heating to given temperature for given duration",
                input: { type: "object", properties: { temperature: { type: "number" }, duration_mins: { type: "number" } } }
            }
        }
    });


    let occupancyStatus = "home";
    let lastMotionTime = Date.now();
    const AWAY_TIMEOUT = 30000;
    systemThing.setPropertyReadHandler('occupancyStatus', async () => occupancyStatus);

    systemThing.setPropertyWriteHandler('occupancyStatus', async (value) => {
        const normalized =
            typeof value === 'string' ? value :
                typeof value?.value === 'string' ? value.value :
                    typeof value?.schema?.value === 'string' ? value.schema.value :
                        undefined;

        if (normalized !== 'home' && normalized !== 'away') {
            throw new Error(`Invalid occupancyStatus: ${JSON.stringify(value)}`);
        }
        occupancyStatus = normalized;
    });

    // Track occupancy internally based on motion events + inactivity timeout.
    if (devices.motionsensor) {
        devices.motionsensor.subscribeEvent('motionDetected', () => {
            lastMotionTime = Date.now();
            if (occupancyStatus === 'away') {
                occupancyStatus = 'home';
                console.log('[SmartHomeThing] Occupancy -> home');
            }
        });
    }

    setInterval(() => {
        if (occupancyStatus === 'home' && Date.now() - lastMotionTime > AWAY_TIMEOUT) {
            occupancyStatus = 'away';
            console.log('[SmartHomeThing] Occupancy -> away');
        }
    }, 5000);

    // Action: triggerAlert
    systemThing.setActionHandler("triggerAlert", async (params) => {
        const message = params?.message || "Alert!";
        if (devices.smartassistant) {
            await devices.smartassistant.invokeAction('say', { phrase: message });
        }
        if (devices.leds) {
            await devices.leds.invokeAction('blink');
        }
    });

    // Action: setHeating
    systemThing.setActionHandler("setHeating", async (params) => {
        const temperature = params?.temperature;
        const duration = params?.duration_mins;
        if (devices.heater && typeof temperature === "number" && typeof duration === "number") {
            await devices.heater.invokeAction('startHeater', { temperature, timeHeating: duration });
        }
    });

    await systemThing.expose();
    console.log(`SmartHomeThing exposed at http://localhost:${port}/smarthomething`);

}

main().catch((err) => {
    console.error('SmartHomeSystem: Fatal error:', err);
    process.exit(1);
});

