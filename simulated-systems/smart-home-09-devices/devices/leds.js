
// devices/leds.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class LEDsSimulator {
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


const port = 8105;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new LEDsSimulator();
    const thing = await WoT.produce({
        title: "LEDs",
        description: "A simulated LEDs device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
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
    thing.setActionHandler("blink", sim.blink.bind(sim));
    thing.setActionHandler("LEDsOn", sim.LEDsOn.bind(sim));
    thing.setActionHandler("LEDsOff", sim.LEDsOff.bind(sim));
    await thing.expose();
    console.log(`LEDs exposed at http://localhost:${port}/leds`);
    const td = await thing.getThingDescription();
    await fetch('http://localhost:8101/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(td)
    });
});