import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9108 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Scheduler Device starting...');
    const tasks = [];

    const thing = await WoT.produce({
        title: "Scheduler",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            scheduleTask: {
                title: "Schedule Task",
                description: "Schedules a task to be carried out by a specific system role",
                input: {
                    type: "object",
                    properties: {
                        role: {
                            type: "string",
                            description: "The system role for which the task is to be scheduled for"
                        },
                        task: {
                            type: "string",
                            description: "The description of the task the be scheduled"
                        }
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
                        task: {
                            type: "string",
                            description: "The description of the task"
                        },
                        dueDate: {
                            type: "number",
                            description: "The time that the task must be completed by"
                        }
                    }
                }
            }
        }
    });

    thing.setActionHandler("scheduleTask", async (input) => {
        const { role, task } = input;
        const scheduledTime = Date.now() + Math.random() * 10000;
        tasks.push({ role, task, scheduledTime });
        console.log(`📅 Task scheduled for role '${role}': ${task}`);
        return null;
    });

    await thing.expose();
    console.log('Scheduler exposed at http://localhost:9108/scheduler');

    // Periodically emit maintenance reminders
    const scheduleMaintenance = () => {
        const randomDelay = Math.random() * 25000 + 20000; // 20000-45000ms
        setTimeout(() => {
            const maintenanceTasks = [
                "Clean tank walls",
                "Replace filter media",
                "Perform water change",
                "Check equipment",
                "Test water parameters"
            ];
            const task = maintenanceTasks[Math.floor(Math.random() * maintenanceTasks.length)];
            const dueDate = Date.now() + 86400000; // Due in 24 hours
            
            thing.emitEvent("regularMaintenanceRequired", { task, dueDate });
            console.log(`🔧 Maintenance reminder: ${task}`);
            scheduleMaintenance();
        }, randomDelay);
    };
    scheduleMaintenance();
});
