import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9106 }));

servient.start().then(async (WoT) => {
    console.log('Simulated LifeformMonitor Device starting...');
    const thing = await WoT.produce({
        title: "LifeformMonitor",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            abnormalActivity: {
                title: "Abnormal Activity",
                description: "An event notifying when there is abnormal activity within the tank",
                data: {
                    type: "object",
                    properties: {
                        lifeform: {
                            type: "string",
                            description: "The identification of the lifeform causing abnormal activity"
                        },
                        details: {
                            type: "string",
                            description: "Details about the activity"
                        }
                    }
                }
            },
            healthIssuesDetected: {
                title: "Health Issues Detected",
                description: "An event notifying of a health issue for one of the lifeforms",
                data: {
                    type: "object",
                    properties: {
                        lifeform: {
                            type: "string",
                            description: "The identification of the lifeform"
                        },
                        details: {
                            type: "string",
                            description: "Details about the health event"
                        }
                    }
                }
            }
        }
    });

    await thing.expose();
    console.log('LifeformMonitor exposed at http://localhost:9106/lifeformmonitor');

    // Simulate abnormal activity and health issues
    const lifeforms = ["Fish_001", "Fish_002", "Coral_001", "Shrimp_001"];
    
    const scheduleAbnormalActivity = () => {
        const randomDelay = Math.random() * 15000 + 10000; // 10000-25000ms
        setTimeout(() => {
            const lifeform = lifeforms[Math.floor(Math.random() * lifeforms.length)];
            const activities = ["erratic movement", "staying at surface", "hiding behavior", "unusual coloration"];
            const details = activities[Math.floor(Math.random() * activities.length)];
            
            thing.emitEvent("abnormalActivity", { lifeform, details });
            console.log(`🐠 Abnormal activity detected - ${lifeform}: ${details}`);
            scheduleAbnormalActivity();
        }, randomDelay);
    };
    scheduleAbnormalActivity();

    const scheduleHealthIssues = () => {
        const randomDelay = Math.random() * 20000 + 15000; // 15000-35000ms
        setTimeout(() => {
            const lifeform = lifeforms[Math.floor(Math.random() * lifeforms.length)];
            const healthIssues = ["fin rot", "ich disease", "stress", "poor appetite"];
            const details = healthIssues[Math.floor(Math.random() * healthIssues.length)];
            
            thing.emitEvent("healthIssuesDetected", { lifeform, details });
            console.log(`🏥 Health issue detected - ${lifeform}: ${details}`);
            scheduleHealthIssues();
        }, randomDelay);
    };
    scheduleHealthIssues();
});
