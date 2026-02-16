import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8085 }));

servient.start().then(async (WoT) => {
    console.log('Simulated DoorBell Device starting...');
    const thing = await WoT.produce({
        title: "DoorBell",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            bellRung: {
                title: "Bell rung",
                description: "The bell was rung",
                data: { type: "null" }
            }
        }
    });

    await thing.expose();
    console.log('DoorBell exposed at http://localhost:8085/doorbell');

    // Simulate bell rung with random interval between 5-15 seconds
    const scheduleBellRing = () => {
        const randomDelay = Math.random() * 10000 + 5000; // 5000-15000ms
        setTimeout(() => {
            thing.emitEvent("bellRung", null);
            console.log("🔔 DoorBell rung! Event 'bellRung' emitted.");
            scheduleBellRing(); // Schedule next ring
        }, randomDelay);
    };
    scheduleBellRing();
});