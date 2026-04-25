
// devices/heater.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class HeaterSimulator {
    async startHeater(input) {
        let params = input;
        if (typeof input?.value === 'function') params = await input.value();
        const temperature = params.temperature;
        const timeHeating = params.timeHeating;
        console.log(`🔥 Heater started at ${temperature}°C for ${timeHeating} minutes.`);
        setTimeout(() => {
            console.log(`⏱️ Heater finished after ${timeHeating} minutes.`);
        }, timeHeating * 60 * 1000);
    }
}

const servient = new Servient();
const port = 8104;
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new HeaterSimulator();

    const thing = await WoT.produce({
        title: "Heater",
        description: "Simulated heater device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            startHeater: {
                title: "Start heater",
                description: "Starts the heater at the given temperature for the given time",
                input: {
                    type: "object",
                    properties: {
                        temperature: { type: "integer", description: "The temperature in degrees C to set for this heater" },
                        timeHeating: { type: "integer", description: "The number of minutes to continue heat for" }
                    }
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("startHeater", sim.startHeater.bind(sim));

    await thing.expose();
    console.log(`Heater exposed at http://localhost:${port}/heater`);

    // Register TD with TDD
    const td = await thing.getThingDescription();
    await fetch('http://localhost:8101/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(td)
    });
});