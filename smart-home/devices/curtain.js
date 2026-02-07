import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8102 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Curtain Device starting...');
    const thing = await WoT.produce({
        title: "Curtain",
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
                description: "Whether the curtain is open",
                readOnly: true
            }
        },
        actions: {
            open: {
                title: "Open curtain",
                description: "Opens the curtain"
            },
            close: {
                title: "Close curtain",
                description: "Closes the curtain"
            }
        },
        events: {}
    });

    let isOpen = false;

    thing.setActionHandler("open", async () => {
        isOpen = true;
        console.log("🪟 Curtain opened.");
        return undefined;
    });
    thing.setActionHandler("close", async () => {
        isOpen = false;
        console.log("🪟 Curtain closed.");
        return undefined;
    });
    thing.setPropertyReadHandler("isOpen", async () => isOpen);

    await thing.expose();
    console.log('Curtain exposed at http://localhost:8102/curtain');
});
