import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class OutageDetector {
    constructor() {
        this.thing = null;
        this._interval = null;
    }

    startEmittingOutages(thing) {
        this.thing = thing;
        const schedulePowerOutage = () => {
            const randomDelay = Math.random() * 30000 + 30000;
            this._interval = setTimeout(() => {
                if (Math.random() < 0.1) {
                    thing.emitEvent("powerOutage", null);
                    console.log("⚡ Power outage detected! Event 'powerOutage' emitted.");
                }
                schedulePowerOutage();
            }, randomDelay);
        };
        schedulePowerOutage();
    }

    stopEmittingOutages() {
        if (this._interval) clearTimeout(this._interval);
    }
}
const port = 9107
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated OutageDetector Device starting...');
    const outageDetector = new OutageDetector();
    const thing = await WoT.produce({
        title: "OutageDetector",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
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
    console.log(`OutageDetector exposed at http://localhost:${port}/outagedetector`);
    outageDetector.startEmittingOutages(thing);
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
