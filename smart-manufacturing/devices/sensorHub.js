import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9007 }));
servient.start().then(async (WoT) => {
    console.log('Simulated SensorHub Device starting...');
    const thing = await WoT.produce({
        title: "SensorHub",
        description: "A simulated sensor hub device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            processSensorData: {
                title: "Process sensor data",
                description: "Adds the provided sensor data for processing",
                input: {
                    type: "object",
                    properties: {
                        sensorName: { type: "string", description: "The name of the sensor" },
                        data: { type: "string", description: "The data for the sensor" }
                    }
                }
            }
        },
        events: {
            dataProcessingComplete: {
                title: "Data processing complete",
                description: "Notification when sensor data processing is complete",
                data: { type: "string", description: "Status information" }
            }
        }
    });

    thing.setActionHandler("processSensorData", async (input) => {
        console.log("Processing sensor data:", input);
        setTimeout(() => {
            thing.emitEvent("dataProcessingComplete", `Processed data for ${input.sensorName}`);
            console.log("Data processing complete event emitted for", input.sensorName);
        }, 2000);
        return undefined;
    });

    await thing.expose();
    console.log('SensorHub exposed at http://localhost:9007/sensorhub');
});