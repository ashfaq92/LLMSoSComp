import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class LifeformMonitor {
    constructor() {
        this.thing = null;
        this._interval = null;
    }

    startEmittingEvents(thing) {
        this.thing = thing;
        // Simulate abnormal activity and health issues
        const emitEvents = () => {
            this._interval = setTimeout(() => {
                // Randomly emit abnormalActivity or healthIssuesDetected
                if (Math.random() < 0.5) {
                    thing.emitEvent("abnormalActivity", {
                        lifeform: "fish" + Math.ceil(Math.random() * 5),
                        details: "Unusual swimming pattern detected."
                    });
                    console.log("🐟 Abnormal activity event emitted.");
                } else {
                    thing.emitEvent("healthIssuesDetected", {
                        lifeform: "fish" + Math.ceil(Math.random() * 5),
                        details: "Possible infection detected."
                    });
                    console.log("🚑 Health issues detected event emitted.");
                }
                emitEvents();
            }, Math.random() * 20000 + 10000); // 10-30s
        };
        emitEvents();
    }

    stopEmittingEvents() {
        if (this._interval) clearTimeout(this._interval);
    }
}

const port = 9106;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated LifeformMonitor Device starting...');
    const lifeformMonitor = new LifeformMonitor();
    const thing = await WoT.produce({
        title: "LifeformMonitor",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            abnormalActivity: {
                title: "Abnormal Activity",
                description: "An event notifying when there is abnormal activity within the tank",
                data: {
                    type: "object",
                    properties: {
                        lifeform: { type: "string" },
                        details: { type: "string" }
                    }
                }
            },
            healthIssuesDetected: {
                title: "Health Issues Detected",
                description: "An event notifying of a health issue for one of the lifeforms",
                data: {
                    type: "object",
                    properties: {
                        lifeform: { type: "string" },
                        details: { type: "string" }
                    }
                }
            }
        }
    });

    await thing.expose();
    console.log(`LifeformMonitor exposed at http://localhost:${port}/lifeformmonitor`);
    lifeformMonitor.startEmittingEvents(thing);
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
