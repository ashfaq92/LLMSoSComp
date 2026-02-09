import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9004 }));
servient.start().then(async (WoT) => {
    console.log('Simulated MaintenanceMonitor Device starting...');
    const thing = await WoT.produce({
        title: "MaintenanceMonitor",
        description: "A simulated maintenance monitor device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            reviewForMaintenance: {
                title: "Review for maintenance",
                description: "Reviews a system's status for issues that may need maintenance",
                input: { type: "string", description: "The status of the system" },
                output: { type: "boolean", description: "Whether or not the system needs maintenance" }
            }
        },
        events: {}
    });

    thing.setActionHandler("reviewForMaintenance", async (input) => {
        // Simulate maintenance review
        const needsMaintenance = Math.random() < 0.3;
        console.log("Maintenance review:", needsMaintenance);
        return needsMaintenance;
    });

    await thing.expose();
    console.log('MaintenanceMonitor exposed at http://localhost:9004/maintenancemonitor');
});