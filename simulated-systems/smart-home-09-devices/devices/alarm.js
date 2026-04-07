import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class Alarm {
    constructor() {
        this.thing = null;
        this._interval = null;
    }

    startEmittingAlarm(thing) {
        this.thing = thing;
        const emitAlarm = () => {
            const randomDelay = Math.random() * 10000 + 5000;
            this._interval = setTimeout(() => {
                thing.emitEvent("alarmRinging", null);
                console.log("🔔 Alarm is ringing! Event 'alarmRinging' emitted.");
                emitAlarm();
            }, randomDelay);
        };
        emitAlarm();
    }

    stopEmittingAlarm() {
        if (this._interval) clearTimeout(this._interval);
    }
}

export default Alarm;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8084 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated Alarm Device starting...');
        const alarm = new Alarm();
        const thing = await WoT.produce({
            title: "Alarm",
            "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
            "@type": ["Thing"],
            securityDefinitions: { no_sec: { scheme: "nosec" } },
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
        alarm.startEmittingAlarm(thing);
    });
}