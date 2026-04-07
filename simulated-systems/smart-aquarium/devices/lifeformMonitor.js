import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

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

export default LifeformMonitor;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 9106 }));

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
        console.log('LifeformMonitor exposed at http://localhost:9106/lifeformmonitor');
        lifeformMonitor.startEmittingEvents(thing);
    });
}
