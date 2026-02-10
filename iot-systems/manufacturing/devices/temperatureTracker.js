import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9008 }));
servient.start().then(async (WoT) => {
    console.log('Simulated TemperatureTracker Device starting...');
    const thing = await WoT.produce({
        title: "TemperatureTracker",
        description: "A simulated temperature tracker device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {},
        events: {
            temperatureAlert: {
                title: "Temperature alert",
                description: "Alert with the current temperature of machines",
                data: { type: "number", description: "The current temperature of machines" }
            }
        }
    });

    await thing.expose();
    console.log('TemperatureTracker exposed at http://localhost:9008/temperaturetracker');

    // Simulate temperature alert every 10-20 seconds
    function emitTemperatureAlert() {
        const temp = Math.floor(Math.random() * 50) + 20;
        thing.emitEvent("temperatureAlert", temp);
        console.log("Temperature alert event emitted:", temp);
        setTimeout(emitTemperatureAlert, Math.random() * 10000 + 10000);
    }
    emitTemperatureAlert();
});