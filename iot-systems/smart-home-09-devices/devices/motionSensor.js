import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8088 }));

servient.start().then(async (WoT) => {
    console.log('Simulated MotionSensor Device starting...');
    const thing = await WoT.produce({
        title: "MotionSensor",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
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

    // Simulate motion detected with random interval between 5-15 seconds
    const scheduleMotionDetection = () => {
        const randomDelay = Math.random() * 10000 + 5000; // 5000-15000ms
        setTimeout(() => {
            thing.emitEvent("motionDetected", null);
            console.log("🚶 Motion detected! Event 'motionDetected' emitted.");
            scheduleMotionDetection(); // Schedule next detection
        }, randomDelay);
    };
    scheduleMotionDetection();
});