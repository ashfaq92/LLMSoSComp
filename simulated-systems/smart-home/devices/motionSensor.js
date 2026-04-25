
// devices/motionSensor.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class MotionSensorSimulator {
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

const port = 8107;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new MotionSensorSimulator();
    const thing = await WoT.produce({
        title: "MotionSensor",
        description: "Simulated motion sensor device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            startMotion: { description: "Start the motion simulation" },
            stopMotion:  { description: "Stop the motion simulation" }
        },
        events: {
            motionDetected: {
                title: "Motion detected",
                description: "An event made when motion is detected",
                data: { type: "null" }
            }
        }
    });
    thing.setActionHandler("startMotion", async () => {
        sim.start(() => {
            thing.emitEvent("motionDetected", null);
            console.log("🚶 motionDetected emitted");
        });
    });
    thing.setActionHandler("stopMotion", async () => sim.stop());
    await thing.expose();
    console.log(`MotionSensor exposed at http://localhost:${port}/motionsensor`);
    sim.start(() => {
        thing.emitEvent("motionDetected", null);
        console.log("🚶 motionDetected emitted");
    });
    const td = await thing.getThingDescription();
    await fetch('http://localhost:8101/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(td)
    });
});