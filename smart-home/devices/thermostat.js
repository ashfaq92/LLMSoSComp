import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8095 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Thermostat Device starting...');
    const thing = await WoT.produce({
        title: "Thermostat",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {
            temperature: {
                type: "number",
                description: "Current temperature in °C",
                readOnly: true
            }
        },
        actions: {
            setTemperature: {
                title: "Set temperature",
                description: "Set the desired temperature",
                input: {
                    type: "object",
                    properties: {
                        temperature: {
                            type: "number",
                            description: "Temperature to set (°C)"
                        }
                    }
                }
            }
        },
        events: {}
    });

    let temperature = 22;

    thing.setActionHandler("setTemperature", async (params) => {
        const input = await params.value();
        if (typeof input.temperature === "number") {
            temperature = input.temperature;
            console.log(`🌡️ Thermostat temperature set to ${temperature}°C`);
        } else {
            console.log("Invalid temperature received.");
        }
        return undefined;
    });
    thing.setPropertyReadHandler("temperature", async () => temperature);

    await thing.expose();
    console.log('Thermostat exposed at http://localhost:8095/thermostat');
});
