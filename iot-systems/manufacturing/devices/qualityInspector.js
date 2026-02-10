import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9006 }));
servient.start().then(async (WoT) => {
    console.log('Simulated QualityInspector Device starting...');
    const thing = await WoT.produce({
        title: "QualityInspector",
        description: "A simulated quality inspector device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            newQualityData: {
                title: "New quality data",
                description: "Alerts when new quality data is ready for processing",
                data: { type: "string", description: "Details about the quality of products" }
            }
        }
    });

    await thing.expose();
    console.log('QualityInspector exposed at http://localhost:9006/qualityinspector');

    // Simulate new quality data event every 15-30 seconds
    function emitQualityData() {
        const eventData = "Quality data: " + Math.random().toString(36).substring(2, 8);
        thing.emitEvent("newQualityData", eventData);
        console.log("New quality data event emitted:", eventData);
        setTimeout(emitQualityData, Math.random() * 15000 + 15000);
    }
    emitQualityData();
});