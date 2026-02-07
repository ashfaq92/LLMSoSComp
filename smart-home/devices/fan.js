import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8094 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Fan Device starting...');
    const thing = await WoT.produce({
        title: "Fan",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {
            speed: {
                type: "integer",
                description: "Current fan speed (0-3)",
                readOnly: true
            }
        },
        actions: {
            setSpeed: {
                title: "Set fan speed",
                description: "Set the speed of the fan",
                input: {
                    type: "object",
                    properties: {
                        speed: {
                            type: "integer",
                            description: "Speed to set (0-3)"
                        }
                    }
                }
            }
        },
        events: {}
    });

    let speed = 0;

    thing.setActionHandler("setSpeed", async (params) => {
        const input = await params.value();
        if (typeof input.speed === "number" && input.speed >= 0 && input.speed <= 3) {
            speed = input.speed;
            console.log(`🌀 Fan speed set to ${speed}`);
        } else {
            console.log("Invalid speed received.");
        }
        return undefined;
    });
    thing.setPropertyReadHandler("speed", async () => speed);

    await thing.expose();
    console.log('Fan exposed at http://localhost:8094/fan');
});
