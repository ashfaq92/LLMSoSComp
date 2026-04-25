
// devices/doorBell.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class DoorBellSimulator {
    constructor() {
        this._timeout = null;
    }

    start(emitFn) {
        const schedule = () => {
            const delay = Math.random() * 10000 + 5000;
            this._timeout = setTimeout(() => {
                emitFn();
                schedule();
            }, delay);
        };
        schedule();
    }

    stop() {
        if (this._timeout) clearTimeout(this._timeout);
    }
}

const port = 8103
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new DoorBellSimulator();

    const thing = await WoT.produce({
        title: "DoorBell",
        description: "Simulated doorbell that emits bellRung events",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            startBell: { description: "Start the doorbell simulation" },
            stopBell:  { description: "Stop the doorbell simulation" }
        },
        events: {
            bellRung: {
                title: "Bell rung",
                description: "The bell was rung",
                data: { type: "null" }
            }
        }
    });

    thing.setActionHandler("startBell", async () => {
        sim.start(() => {
            thing.emitEvent("bellRung", null);
            console.log("🔔 bellRung emitted");
        });
    });

    thing.setActionHandler("stopBell", async () => sim.stop());

    await thing.expose();
    console.log(`DoorBell exposed at http://localhost:${port}/doorbell`);
    sim.start(() => {
        thing.emitEvent("bellRung", null);
        console.log("🔔 bellRung emitted");
    });

    const td = await thing.getThingDescription();
    await fetch('http://localhost:8101/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(td)
    });
});