import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class Clock {
    constructor() {
        this.interval = null;
        this.thing = null;
    }

    startEmittingTime(thing) {
        this.thing = thing;
        this.interval = setInterval(() => {
            const currentTime = Date.now();
            thing.emitEvent("time", currentTime);
            console.log(`⏰ Time event emitted: ${currentTime}`);
        }, 5000);
    }

    stopEmittingTime() {
        if (this.interval) clearInterval(this.interval);
    }
}

export default Clock;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 9103 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated Clock Device starting...');
        const clock = new Clock();
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

        clock.startEmittingTime(thing);
    });
}
