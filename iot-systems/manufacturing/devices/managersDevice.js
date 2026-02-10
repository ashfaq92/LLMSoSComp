import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9005 }));
servient.start().then(async (WoT) => {
    console.log('Simulated ManagersDevice Device starting...');
    const thing = await WoT.produce({
        title: "ManagersDevice",
        description: "A simulated manager's device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            alertManager: {
                title: "Alert the manager",
                description: "Makes an alert on the manager's device",
                input: {
                    type: "object",
                    properties: {
                        alertType: { type: "string", description: "The type of alert" },
                        alertContent: { type: "string", description: "The contents of the alert" }
                    }
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("alertManager", async (input) => {
        console.log("Manager alert:", input);
        return undefined;
    });

    await thing.expose();
    console.log('ManagersDevice exposed at http://localhost:9005/managersdevice');
});