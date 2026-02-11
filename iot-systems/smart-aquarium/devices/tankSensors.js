import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9112 }));

servient.start().then(async (WoT) => {
    console.log('Simulated TankSensors Device starting...');
    
    // Initialize sensor values
    const minPH = 0;
    const maxPH = 15;
        let pHLevel = minPH + Math.random() * (maxPH - minPH);
    let temperature = 25 + (Math.random() - 0.5) * 2;
    let salinity = 1.020 + (Math.random() - 0.5) * 0.005;
    let nitrateLevel = 20 + Math.random() * 10;

    const thing = await WoT.produce({
        title: "TankSensors",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {
            pHLevel: {
                type: "number",
                title: "pH level",
                description: "The pH Level of the water in the tank"
            },
            temperature: {
                type: "number",
                title: "Temperature",
                description: "The temperature of the water in the tank"
            },
            salinity: {
                type: "number",
                title: "Salinity",
                description: "The salinity of the water in the tank"
            },
            nitrateLevel: {
                type: "number",
                title: "Nitrate Level",
                description: "The amount of nitrates in the tank's water"
            }
        },
        actions: {},
        events: {
            pHLevel: {
                title: "pH Level",
                description: "A periodic report of the pH level of the tank's water",
                data: {
                    type: "number",
                    description: "The pH level"
                }
            },
            temperature: {
                title: "Temperature",
                description: "A periodic notification of the current water temperature of the tank",
                data: {
                    type: "number",
                    description: "The temperature of the water"
                }
            },
            salinity: {
                title: "Salinity",
                description: "The current concentration of salt in the tank's water",
                data: {
                    type: "number",
                    description: "The concentration of salt in the water"
                }
            },
            nitrateLevel: {
                title: "Nitrate Level",
                description: "Notification of the current amount of nitrate in the tank water",
                data: {
                    type: "number",
                    description: "The amount of nitrates"
                }
            }
        }
    });

    thing.setPropertyReadHandler("pHLevel", async () => pHLevel);
    thing.setPropertyReadHandler("temperature", async () => temperature);
    thing.setPropertyReadHandler("salinity", async () => salinity);
    thing.setPropertyReadHandler("nitrateLevel", async () => nitrateLevel);

    await thing.expose();
    console.log('TankSensors exposed at http://localhost:9112/tanksensors');

    // Simulate sensor readings with slight variations
    setInterval(() => {
        pHLevel = minPH + Math.random() * (maxPH - minPH);
        temperature = Math.max(20, Math.min(30, temperature + (Math.random() - 0.5) * 0.5));
        salinity = Math.max(1.015, Math.min(1.025, salinity + (Math.random() - 0.5) * 0.001));
        nitrateLevel = Math.max(0, nitrateLevel + (Math.random() - 0.5) * 1);

        thing.emitEvent("pHLevel", pHLevel);
        thing.emitEvent("temperature", temperature);
        thing.emitEvent("salinity", salinity);
        thing.emitEvent("nitrateLevel", nitrateLevel);

        console.log(`📊 Sensor readings - pH: ${pHLevel.toFixed(2)}, Temp: ${temperature.toFixed(1)}°C, Salinity: ${salinity.toFixed(3)}, Nitrate: ${nitrateLevel.toFixed(1)}`);
    }, 3000);
});
