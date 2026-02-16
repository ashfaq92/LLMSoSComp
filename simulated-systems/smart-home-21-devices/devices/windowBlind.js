import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8091 }));

servient.start().then(async (WoT) => {
    console.log('Simulated WindowBlind Device starting...');
    const thing = await WoT.produce({
        title: "WindowBlind",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {
            position: {
                type: "integer",
                description: "Current position of the blind (0=closed, 100=open)",
                readOnly: true
            }
        },
        actions: {
            setPosition: {
                title: "Set blind position",
                description: "Set the position of the window blind",
                input: {
                    type: "object",
                    properties: {
                        position: {
                            type: "integer",
                            description: "Position to set (0-100)"
                        }
                    }
                }
            }
        },
        events: {}
    });

    let position = 0;

    thing.setActionHandler("setPosition", async (params) => {
        const input = await params.value();
        if (typeof input.position === "number" && input.position >= 0 && input.position <= 100) {
            position = input.position;
            console.log(`🪟 WindowBlind position set to ${position}`);
        } else {
            console.log("Invalid position received.");
        }
        return undefined;
    });

    thing.setPropertyReadHandler("position", async () => position);

    await thing.expose();
    console.log('WindowBlind exposed at http://localhost:8091/windowblind');
});
