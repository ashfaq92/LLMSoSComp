import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class Scheduler {
    constructor() {
        this.tasks = [];
        this.thing = null;
        this._interval = null;
    }

    setThing(thing) {
        this.thing = thing;
    }

    async scheduleTask({ role, task }) {
        const scheduledTime = Date.now() + Math.random() * 10000;
        this.tasks.push({ role, task, scheduledTime });
        console.log(`📅 Task scheduled for role '${role}': ${task}`);
    }

    startMaintenanceReminders() {
        const scheduleMaintenance = () => {
            const randomDelay = Math.random() * 25000 + 20000;
            this._interval = setTimeout(() => {
                const maintenanceTasks = [
                    "Clean tank walls",
                    "Replace filter media",
                    "Perform water change",
                    "Check equipment",
                    "Test water parameters"
                ];
                const task = maintenanceTasks[Math.floor(Math.random() * maintenanceTasks.length)];
                const dueDate = Date.now() + 86400000;
                if (this.thing) {
                    this.thing.emitEvent("regularMaintenanceRequired", { task, dueDate });
                    console.log(`🔧 Maintenance reminder: ${task}`);
                }
                scheduleMaintenance();
            }, randomDelay);
        };
        scheduleMaintenance();
    }

    stopMaintenanceReminders() {
        if (this._interval) clearTimeout(this._interval);
    }
}

const port = 9108;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated Scheduler Device starting...');
    const scheduler = new Scheduler();
    const thing = await WoT.produce({
        title: "Scheduler",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            scheduleTask: {
                title: "Schedule Task",
                description: "Schedules a task to be carried out by a specific system role",
                input: {
                    type: "object",
                    properties: {
                        role: { type: "string" },
                        task: { type: "string" }
                    }
                }
            }
        },
        events: {
            regularMaintenanceRequired: {
                title: "Regular Maintenance Required",
                description: "An alert for regular tank maintenance",
                data: {
                    type: "object",
                    properties: {
                        task: { type: "string" },
                        dueDate: { type: "number" }
                    }
                }
            }
        }
    });

    scheduler.setThing(thing);
    thing.setActionHandler("scheduleTask", scheduler.scheduleTask.bind(scheduler));
    await thing.expose();
    console.log(`Scheduler exposed at http://localhost:${port}/scheduler`);
    scheduler.startMaintenanceReminders();
    
    // Register TD with TDD
    const td = await thing.getThingDescription();
    try {
        await fetch('http://localhost:9101/things', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(td)
        });
    } catch (err) {
        console.warn('Could not register TD with TDD:', err.message);
    }
});
