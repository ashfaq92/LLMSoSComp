import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8084 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Alarm Device starting...');
    const thing = await WoT.produce({
        title: "Alarm",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            alarmRinging: {
                title: "Alarm Ringing",
                description: "This alarm has started ringing",
                data: { type: "null" }
            }
        }
    });

    await thing.expose();
    console.log('Alarm exposed at http://localhost:8084/alarm');

    // Simulate alarm ringing with random interval between 5-15 seconds
    const scheduleAlarmRing = () => {
        const randomDelay = Math.random() * 10000 + 5000; // 5000-15000ms
        setTimeout(() => {
            thing.emitEvent("alarmRinging", null);
            console.log("🔔 Alarm is ringing! Event 'alarmRinging' emitted.");
            scheduleAlarmRing(); // Schedule next ring
        }, randomDelay);
    };
    scheduleAlarmRing();
});