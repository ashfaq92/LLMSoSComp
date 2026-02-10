import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8083 }));
servient.start().then(async (WoT) => {
    console.log('Simulated LEDs Device starting...');
    const thing = await WoT.produce({
        title: "LEDs",
        description: "A simulated LEDs device",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            blink: {
                title: "Blink LEDs",
                description: "Blinks the LEDs"
            },
            LEDsOn: {
                title: "Turn LEDs on",
                description: "Turns on the LEDs"
            },
            LEDsOff: {
                title: "Turn LEDs off",
                description: "Turns off the LEDs"
            }
        },
        events: {}
    });

    let state = false;

    thing.setActionHandler("blink", async () => {
        console.log("Action: blink");
        state = true;
        console.log("LEDs are BLINKING");
        setTimeout(() => {
            state = false;
            console.log("LEDs stopped BLINKING");
        }, 1000);
        return undefined;
    });

    thing.setActionHandler("LEDsOn", async () => {
        state = true;
        console.log("Action: LEDsOn - LEDs are ON");
        return undefined;
    });

    thing.setActionHandler("LEDsOff", async () => {
        state = false;
        console.log("Action: LEDsOff - LEDs are OFF");
        return undefined;
    });

    await thing.expose();
    console.log('LEDs exposed at http://localhost:8083/leds');
});