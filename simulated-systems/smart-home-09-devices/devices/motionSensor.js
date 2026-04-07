import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class MotionSensor {
    constructor() {
        this.thing = null;
        this._interval = null;
    }

    startEmittingMotion(thing) {
        this.thing = thing;
        const emitMotion = () => {
            const randomDelay = Math.random() * 10000 + 5000;
            this._interval = setTimeout(() => {
                thing.emitEvent("motionDetected", null);
                console.log("🚶 Motion detected! Event 'motionDetected' emitted.");
                emitMotion();
            }, randomDelay);
        };
        emitMotion();
    }

    stopEmittingMotion() {
        if (this._interval) clearTimeout(this._interval);
    }
}

export default MotionSensor;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8088 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated MotionSensor Device starting...');
        const motionSensor = new MotionSensor();
        const thing = await WoT.produce({
            title: "MotionSensor",
            "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
            "@type": ["Thing"],
            securityDefinitions: { no_sec: { scheme: "nosec" } },
            security: ["no_sec"],
            properties: {},
            actions: {},
            events: {
                motionDetected: {
                    title: "Motion detected",
                    description: "An event made when motion is detected",
                    data: { type: "null" }
                }
            }
        });
        await thing.expose();
        console.log('MotionSensor exposed at http://localhost:8088/motionsensor');
        motionSensor.startEmittingMotion(thing);
    });
}