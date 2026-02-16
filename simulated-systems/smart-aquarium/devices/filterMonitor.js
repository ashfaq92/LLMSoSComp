import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9104 }));

servient.start().then(async (WoT) => {
    console.log('Simulated FilterMonitor Device starting...');
    const thing = await WoT.produce({
        title: "FilterMonitor",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            filterIssue: {
                title: "Filter Issue",
                description: "A notification made when an issue with the filter is detected, preventing it from correctly functioning",
                data: { type: "null" }
            }
        }
    });

    await thing.expose();
    console.log('FilterMonitor exposed at http://localhost:9104/filtermonitor');

    // Simulate filter issues with random interval between 20-40 seconds
    const scheduleFilterIssue = () => {
        const randomDelay = Math.random() * 20000 + 20000; // 20000-40000ms
        setTimeout(() => {
            thing.emitEvent("filterIssue", null);
            console.log("🚨 Filter issue detected! Event 'filterIssue' emitted.");
            scheduleFilterIssue(); // Schedule next issue
        }, randomDelay);
    };
    scheduleFilterIssue();
});
