import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9109 }));

servient.start().then(async (WoT) => {
    console.log('Simulated TankActuators Device starting...');
    let heaterStatus = false;
    let coolerStatus = false;
    let targetTemp = 25;

    const thing = await WoT.produce({
        title: "TankActuators",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            heaterOn: {
                title: "Heater On",
                description: "Turns the water heater on",
                input: {
                    type: "number",
                    description: "The target temperature of the water"
                }
            },
            heaterOff: {
                title: "Heater Off",
                description: "Turns the water heater off"
            },
            coolerOn: {
                title: "Cooler On",
                description: "Turns the water cooler on",
                input: {
                    type: "number",
                    description: "The target temperature of the water"
                }
            },
            coolerOff: {
                title: "Cooler Off",
                description: "Turns the water cooler off"
            },
            dispenseChemical: {
                title: "Dispense Chemical",
                description: "Dispenses the specified chemical into the water tank",
                input: {
                    type: "object",
                    properties: {
                        chemical: {
                            type: "string",
                            description: "The chemical to release into the water"
                        },
                        amount: {
                            type: "number",
                            description: "The amount of the specified chamical to be released"
                        }
                    }
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("heaterOn", async (temperature) => {
        heaterStatus = true;
        targetTemp = temperature;
        console.log(`🔥 Heater turned ON - Target temperature: ${temperature}°C`);
        return null;
    });

    thing.setActionHandler("heaterOff", async () => {
        heaterStatus = false;
        console.log(`❄️  Heater turned OFF`);
        return null;
    });

    thing.setActionHandler("coolerOn", async (temperature) => {
        coolerStatus = true;
        targetTemp = temperature;
        console.log(`❄️  Cooler turned ON - Target temperature: ${temperature}°C`);
        return null;
    });

    thing.setActionHandler("coolerOff", async () => {
        coolerStatus = false;
        console.log(`🔥 Cooler turned OFF`);
        return null;
    });

    thing.setActionHandler("dispenseChemical", async (input) => {
        const { chemical, amount } = input;
        console.log(`🧪 Dispensing ${amount} units of ${chemical}`);
        return null;
    });

    await thing.expose();
    console.log('TankActuators exposed at http://localhost:9109/tankactuators');
});
