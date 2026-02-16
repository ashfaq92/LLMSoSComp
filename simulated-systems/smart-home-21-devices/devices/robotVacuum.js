import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8098 }));

servient.start().then(async (WoT) => {
    console.log('Simulated RobotVacuum Device starting...');
    const thing = await WoT.produce({
        title: "RobotVacuum",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {
            isCleaning: {
                type: "boolean",
                description: "Whether the vacuum is cleaning",
                readOnly: true
            }
        },
        actions: {
            startCleaning: {
                title: "Start cleaning",
                description: "Starts the cleaning process"
            },
            stopCleaning: {
                title: "Stop cleaning",
                description: "Stops the cleaning process"
            }
        },
        events: {}
    });

    let isCleaning = false;

    thing.setActionHandler("startCleaning", async () => {
        isCleaning = true;
        console.log("🤖 RobotVacuum started cleaning.");
        return undefined;
    });
    thing.setActionHandler("stopCleaning", async () => {
        isCleaning = false;
        console.log("🤖 RobotVacuum stopped cleaning.");
        return undefined;
    });
    thing.setPropertyReadHandler("isCleaning", async () => isCleaning);

    await thing.expose();
    console.log('RobotVacuum exposed at http://localhost:8098/robotvacuum');
});
