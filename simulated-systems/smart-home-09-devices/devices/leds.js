// leds.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class LEDs {
    constructor() {
        this.state = false;
    }

    async blink() {
        this.state = true;
        console.log("LEDs are BLINKING");
        setTimeout(() => {
            this.state = false;
            console.log("LEDs stopped BLINKING");
        }, 1000);
        return "blinked";
    }

    async LEDsOn() {
        this.state = true;
        console.log("Action: LEDsOn - LEDs are ON");
    }

    async LEDsOff() {
        this.state = false;
        console.log("Action: LEDsOff - LEDs are OFF");
    }
}

export default LEDs;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8083 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated LEDs Device starting...');
        const leds = new LEDs();
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
                    description: "Blinks the LEDs",
                    output: { type: 'string' }
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

        thing.setActionHandler("blink", leds.blink.bind(leds));
        thing.setActionHandler("LEDsOn", leds.LEDsOn.bind(leds));
        thing.setActionHandler("LEDsOff", leds.LEDsOff.bind(leds));

        await thing.expose();
        console.log('LEDs exposed at http://localhost:8083/leds');
    });
}