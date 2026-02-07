import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8097 }));

servient.start().then(async (WoT) => {
    console.log('Simulated PetFeeder Device starting...');
    const thing = await WoT.produce({
        title: "PetFeeder",
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
            dispense: {
                title: "Dispense food",
                description: "Dispenses food for the pet"
            }
        },
        events: {
            foodDispensed: {
                title: "Food dispensed",
                description: "Food has been dispensed",
                data: { type: "null" }
            }
        }
    });

    thing.setActionHandler("dispense", async () => {
        console.log("🐾 Dispensing food...");
        setTimeout(() => {
            thing.emitEvent("foodDispensed", null);
            console.log("🐾 Food dispensed! Event 'foodDispensed' emitted.");
        }, 2000);
        return undefined;
    });

    await thing.expose();
    console.log('PetFeeder exposed at http://localhost:8097/petfeeder');
});
