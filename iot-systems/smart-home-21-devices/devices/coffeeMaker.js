import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8093 }));

servient.start().then(async (WoT) => {
    console.log('Simulated CoffeeMaker Device starting...');
    const thing = await WoT.produce({
        title: "CoffeeMaker",
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
            brew: {
                title: "Brew coffee",
                description: "Starts brewing coffee"
            }
        },
        events: {
            coffeeReady: {
                title: "Coffee ready",
                description: "Coffee is ready to serve",
                data: { type: "null" }
            }
        }
    });

    thing.setActionHandler("brew", async () => {
        console.log("☕ Brewing coffee...");
        setTimeout(() => {
            thing.emitEvent("coffeeReady", null);
            console.log("☕ Coffee is ready! Event 'coffeeReady' emitted.");
        }, 3000);
        return undefined;
    });

    await thing.expose();
    console.log('CoffeeMaker exposed at http://localhost:8093/coffeemaker');
});
