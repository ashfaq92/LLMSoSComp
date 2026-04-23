// devices/alarm.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class AlarmSimulator {
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

const port = 8102
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new AlarmSimulator();

    const thing = await WoT.produce({
        title: "Alarm",
        description: "Simulated alarm that emits alarmRinging events",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            startAlarm: { description: "Start the alarm simulation" },
            stopAlarm:  { description: "Stop the alarm simulation" }
        },
        events: {
            alarmRinging: {
                title: "Alarm Ringing",
                data: { type: "null" }
            }
        }
    });

    thing.setActionHandler("startAlarm", async () => {
        sim.start(() => {
            thing.emitEvent("alarmRinging", null);
            console.log("🔔 alarmRinging emitted");
        });
    });

    thing.setActionHandler("stopAlarm", async () => sim.stop());

    await thing.expose();
    console.log(`Alarm exposed at http://localhost:${port}/alarm`);
    sim.start(() => {
        thing.emitEvent("alarmRinging", null);
        console.log("🔔 alarmRinging emitted");
    });

    const td = await thing.getThingDescription();
    await fetch('http://localhost:8101/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(td)
});
});