import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9107 }));

servient.start().then(async (WoT) => {
    console.log('Simulated OutageDetector Device starting...');
    const thing = await WoT.produce({
        title: "OutageDetector",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            powerOutage: {
                title: "Power Outage",
                description: "Notification of a power outage",
                data: { type: "null" }
            }
        }
    });

    await thing.expose();
    console.log('OutageDetector exposed at http://localhost:9107/outagedetector');

    // Simulate power outages with random interval between 30-60 seconds (low probability)
    const schedulePowerOutage = () => {
        const randomDelay = Math.random() * 30000 + 30000; // 30000-60000ms
        setTimeout(() => {
            // Only emit event 10% of the time to simulate rare events
            if (Math.random() < 0.1) {
                thing.emitEvent("powerOutage", null);
                console.log("⚡ Power outage detected! Event 'powerOutage' emitted.");
            }
            schedulePowerOutage();
        }, randomDelay);
    };
    schedulePowerOutage();
});
