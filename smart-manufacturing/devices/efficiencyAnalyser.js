import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9002 }));
servient.start().then(async (WoT) => {
    console.log('Simulated EfficiencyAnalyser Device starting...');
    const thing = await WoT.produce({
        title: "EfficiencyAnalyser",
        description: "A simulated efficiency analyser device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            calculateEfficiency: {
                title: "Calculate efficiency",
                description: "Calculates the efficiency of the system",
                input: { type: "string", description: "The status of the system" },
                output: { type: "integer", description: "The calculated percentage efficiency of the system" }
            }
        },
        events: {}
    });

    thing.setActionHandler("calculateEfficiency", async (input) => {
        // Simulate efficiency calculation
        const efficiency = Math.floor(Math.random() * 100);
        console.log("Efficiency calculated:", efficiency, "%");
        return efficiency;
    });

    await thing.expose();
    console.log('EfficiencyAnalyser exposed at http://localhost:9002/efficiencyanalyser');
});