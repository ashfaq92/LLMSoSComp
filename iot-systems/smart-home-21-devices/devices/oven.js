import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8101 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Oven Device starting...');
    const thing = await WoT.produce({
        title: "Oven",
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
                description: "Current oven temperature in °C",
                readOnly: true
            }
        },
        actions: {
            setTemperature: {
                title: "Set oven temperature",
                description: "Set the temperature of the oven",
                input: {
                    type: "object",
                    properties: {
                        temperature: {
                            type: "number",
                            description: "Temperature to set (°C)"
                        }
                    }
                }
            },
            startBake: {
                title: "Start baking",
                description: "Starts the baking process"
            }
        },
        events: {
            bakingDone: {
                title: "Baking done",
                description: "Baking process finished",
                data: { type: "null" }
            }
        }
    });

    let temperature = 180;

    thing.setActionHandler("setTemperature", async (params) => {
        const input = await params.value();
        if (typeof input.temperature === "number") {
            temperature = input.temperature;
            console.log(`🔥 Oven temperature set to ${temperature}°C`);
        } else {
            console.log("Invalid temperature received.");
        }
        return undefined;
    });
    thing.setPropertyReadHandler("temperature", async () => temperature);

    thing.setActionHandler("startBake", async () => {
        console.log("🔥 Baking started...");
        setTimeout(() => {
            thing.emitEvent("bakingDone", null);
            console.log("🔥 Baking done! Event 'bakingDone' emitted.");
        }, 5000);
        return undefined;
    });

    await thing.expose();
    console.log('Oven exposed at http://localhost:8101/oven');
});
