import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8092 }));

servient.start().then(async (WoT) => {
    console.log('Simulated GarageDoor Device starting...');
    const thing = await WoT.produce({
        title: "GarageDoor",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {
            isOpen: {
                type: "boolean",
                description: "Whether the garage door is open",
                readOnly: true
            }
        },
        actions: {
            open: {
                title: "Open garage door",
                description: "Opens the garage door"
            },
            close: {
                title: "Close garage door",
                description: "Closes the garage door"
            }
        },
        events: {}
    });

    let isOpen = false;

    thing.setActionHandler("open", async () => {
        isOpen = true;
        console.log("🚗 Garage door opened.");
        return undefined;
    });
    thing.setActionHandler("close", async () => {
        isOpen = false;
        console.log("🚗 Garage door closed.");
        return undefined;
    });
    thing.setPropertyReadHandler("isOpen", async () => isOpen);

    await thing.expose();
    console.log('GarageDoor exposed at http://localhost:8092/garagedoor');
});
