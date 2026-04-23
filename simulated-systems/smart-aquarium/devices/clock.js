import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

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

const port = 9103;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

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
    console.log(`Clock exposed at http://localhost:${port}/clock`);

    clock.startEmittingTime(thing);

    const td = await thing.getThingDescription();
    try {
        await fetch('http://localhost:9101/things', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(td)
        });
    } catch (err) {
        console.warn('Could not register TD with TDD:', err.message);
    }
});
