import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8099 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Sprinkler Device starting...');
    const thing = await WoT.produce({
        title: "Sprinkler",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {
            isOn: {
                type: "boolean",
                description: "Whether the sprinkler is on",
                readOnly: true
            }
        },
        actions: {
            turnOn: {
                title: "Turn on sprinkler",
                description: "Turns on the sprinkler"
            },
            turnOff: {
                title: "Turn off sprinkler",
                description: "Turns off the sprinkler"
            }
        },
        events: {}
    });

    let isOn = false;

    thing.setActionHandler("turnOn", async () => {
        isOn = true;
        console.log("💧 Sprinkler turned ON.");
        return undefined;
    });
    thing.setActionHandler("turnOff", async () => {
        isOn = false;
        console.log("💧 Sprinkler turned OFF.");
        return undefined;
    });
    thing.setPropertyReadHandler("isOn", async () => isOn);

    await thing.expose();
    console.log('Sprinkler exposed at http://localhost:8099/sprinkler');
});
