import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class Heater {
    async startHeater(input) {
        // input may be an InteractionOutput or plain object
        let params = input;
        if (typeof input?.value === 'function') params = await input.value();
        const temperature = params.temperature;
        const timeHeating = params.timeHeating;
        console.log(`🔥 Heater started at ${temperature}°C for ${timeHeating} minutes.`);
        setTimeout(() => {
            console.log(`⏱️ Heater finished after ${timeHeating} minutes.`);
        }, timeHeating * 60 * 1000);
    }
}

export default Heater;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8086 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated Heater Device starting...');
        const heater = new Heater();
        const thing = await WoT.produce({
            title: "Heater",
            "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
            "@type": ["Thing"],
            securityDefinitions: { no_sec: { scheme: "nosec" } },
            security: ["no_sec"],
            properties: {},
            actions: {
                startHeater: {
                    title: "Start heater",
                    description: "Starts the heater at the given temperature for the given time",
                    input: {
                        type: "object",
                        properties: {
                            temperature: { type: "integer", description: "The temperature in degrees C to set for this heater" },
                            timeHeating: { type: "integer", description: "The number of minutes to continue heat for" }
                        }
                    }
                }
            },
            events: {}
        });
        await thing.expose();
        console.log('Heater exposed at http://localhost:8086/heater');
        thing.setActionHandler("startHeater", heater.startHeater.bind(heater));
    });
}