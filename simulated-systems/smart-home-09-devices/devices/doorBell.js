import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';


class DoorBell {
    constructor() {
        this.thing = null;
        this._interval = null;
    }

    startEmittingBell(thing) {
        this.thing = thing;
        const emitBell = () => {
            const randomDelay = Math.random() * 10000 + 5000;
            this._interval = setTimeout(() => {
                thing.emitEvent("bellRung", null);
                console.log("🔔 DoorBell rung! Event 'bellRung' emitted.");
                emitBell();
            }, randomDelay);
        };
        emitBell();
    }

    stopEmittingBell() {
        if (this._interval) clearTimeout(this._interval);
    }
}

export default DoorBell;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8085 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated DoorBell Device starting...');
        const doorBell = new DoorBell();
        const thing = await WoT.produce({
            title: "DoorBell",
            "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
            "@type": ["Thing"],
            securityDefinitions: { no_sec: { scheme: "nosec" } },
            security: ["no_sec"],
            properties: {},
            actions: {},
            events: {
                bellRung: {
                    title: "Bell rung",
                    description: "The bell was rung",
                    data: { type: "null" }
                }
            }
        });
        await thing.expose();
        console.log('DoorBell exposed at http://localhost:8085/doorbell');
        doorBell.startEmittingBell(thing);
    });
}