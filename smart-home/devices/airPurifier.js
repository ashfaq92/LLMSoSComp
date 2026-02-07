import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8096 }));

servient.start().then(async (WoT) => {
    console.log('Simulated AirPurifier Device starting...');
    const thing = await WoT.produce({
        title: "AirPurifier",
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
                description: "Whether the air purifier is on",
                readOnly: true
            }
        },
        actions: {
            turnOn: {
                title: "Turn on air purifier",
                description: "Turns on the air purifier"
            },
            turnOff: {
                title: "Turn off air purifier",
                description: "Turns off the air purifier"
            }
        },
        events: {}
    });

    let isOn = false;

    thing.setActionHandler("turnOn", async () => {
        isOn = true;
        console.log("🍃 AirPurifier turned ON.");
        return undefined;
    });
    thing.setActionHandler("turnOff", async () => {
        isOn = false;
        console.log("🍃 AirPurifier turned OFF.");
        return undefined;
    });
    thing.setPropertyReadHandler("isOn", async () => isOn);

    await thing.expose();
    console.log('AirPurifier exposed at http://localhost:8096/airpurifier');
});
