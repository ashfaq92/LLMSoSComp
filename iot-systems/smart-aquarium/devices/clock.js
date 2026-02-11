import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9103 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Clock Device starting...');
    const thing = await WoT.produce({
        title: "Clock",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            time: {
                title: "Time",
                description: "The current time",
                data: {
                    type: "number",
                    description: "The time"
                }
            }
        }
    });

    await thing.expose();
    console.log('Clock exposed at http://localhost:9103/clock');

    // Emit time every 5 seconds
    setInterval(() => {
        const currentTime = Date.now();
        thing.emitEvent("time", currentTime);
        console.log(`⏰ Time event emitted: ${currentTime}`);
    }, 5000);
});
