import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9001 }));
servient.start().then(async (WoT) => {
    console.log('Simulated Database Device starting...');
    const thing = await WoT.produce({
        title: "Database",
        description: "A simulated database device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            logData: {
                title: "Log data",
                description: "Logs the input data",
                input: { type: "string", description: "The data to be logged" }
            }
        },
        events: {}
    });

    thing.setActionHandler("logData", async (input) => {
        console.log("Database logData:", input);
        return undefined;
    });

    await thing.expose();
    console.log('Database exposed at http://localhost:9001/database');
});