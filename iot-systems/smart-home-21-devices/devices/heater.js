import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8086 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Heater Device starting...');
    const thing = await WoT.produce({
        title: "Heater",
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
            startHeater: {
                title: "Start heater",
                description: "Starts the heater at the given temperature for the given time",
                input: {
                    type: "object",
                    properties: {
                        temperature: {
                            type: "integer",
                            description: "The temperature in degrees C to set for this heater"
                        },
                        timeHeating: {
                            type: "integer",
                            description: "The number of minutes to continue heat for"
                        }
                    }
                }
            }
        },
        events: {}
    });

    await thing.expose();
    console.log('Heater exposed at http://localhost:8086/heater');

    thing.setActionHandler("startHeater", async (params) => {
        const input = await params.value();
        const temperature = input.temperature;
        const timeHeating = input.timeHeating;
        console.log(`🔥 Heater started at ${temperature}°C for ${timeHeating} minutes.`);
        // Simulate heating (no real state, just log)
        setTimeout(() => {
            console.log(`⏱️ Heater finished after ${timeHeating} minutes.`);
        }, timeHeating * 60 * 1000); // Convert minutes to ms
        return undefined;
    });
});