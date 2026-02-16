import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9009 }));
servient.start().then(async (WoT) => {
    console.log('Simulated VibrationMonitor Device starting...');
    const thing = await WoT.produce({
        title: "VibrationMonitor",
        description: "A simulated vibration monitor device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            vibrationAlert: {
                title: "Vibration alert",
                description: "Notification of the current vibration of machines",
                data: { type: "number", description: "The amplitude of the current vibration" }
            }
        }
    });

    await thing.expose();
    console.log('VibrationMonitor exposed at http://localhost:9009/vibrationmonitor');

    // Simulate vibration alert every 10-20 seconds
    function emitVibrationAlert() {
        const vibration = Math.random() * 10;
        thing.emitEvent("vibrationAlert", vibration);
        console.log("Vibration alert event emitted:", vibration);
        setTimeout(emitVibrationAlert, Math.random() * 10000 + 10000);
    }
    emitVibrationAlert();
});