import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class FilterMonitor {
    constructor() {
        this.thing = null;
        this._interval = null;
    }

    startEmittingIssues(thing) {
        this.thing = thing;
        const scheduleFilterIssue = () => {
            const randomDelay = Math.random() * 20000 + 20000;
            this._interval = setTimeout(() => {
                thing.emitEvent("filterIssue", null);
                console.log("🚨 Filter issue detected! Event 'filterIssue' emitted.");
                scheduleFilterIssue();
            }, randomDelay);
        };
        scheduleFilterIssue();
    }

    stopEmittingIssues() {
        if (this._interval) clearTimeout(this._interval);
    }
}

const port = 9104;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated FilterMonitor Device starting...');
    const filterMonitor = new FilterMonitor();
    const thing = await WoT.produce({
        title: "FilterMonitor",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
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
    console.log(`FilterMonitor exposed at http://localhost:${port}/filtermonitor`);
    filterMonitor.startEmittingIssues(thing);
    // Register TD with TDD
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
