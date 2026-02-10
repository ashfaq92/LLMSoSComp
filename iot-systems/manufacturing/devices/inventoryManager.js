import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9003 }));
servient.start().then(async (WoT) => {
    console.log('Simulated InventoryManager Device starting...');
    const thing = await WoT.produce({
        title: "InventoryManager",
        description: "A simulated inventory manager device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            resourceUsed: {
                title: "Resource used",
                description: "Makes an alert when a resource is used",
                data: {
                    type: "object",
                    properties: {
                        resourceName: { type: "string", description: "The name of the resource used" },
                        quantity: { type: "number", description: "The amount of the resource used" }
                    }
                }
            }
        }
    });

    await thing.expose();
    console.log('InventoryManager exposed at http://localhost:9003/inventorymanager');

    // Simulate resource usage event every 10-20 seconds
    const resources = ["Steel", "Plastic", "Copper"];
    function emitResourceUsed() {
        const eventData = {
            resourceName: resources[Math.floor(Math.random() * resources.length)],
            quantity: Math.floor(Math.random() * 10) + 1
        };
        thing.emitEvent("resourceUsed", eventData);
        console.log("Resource used event emitted:", eventData);
        setTimeout(emitResourceUsed, Math.random() * 10000 + 10000);
    }
    emitResourceUsed();
});