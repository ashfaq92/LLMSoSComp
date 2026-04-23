

import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class TankActuators {
    constructor() {
        this.heaterStatus = false;
        this.coolerStatus = false;
        this.targetTemp = 25;
    }

    async heaterOn(input) {
        let temp = input;
        if (typeof input?.value === 'function') temp = await input.value();
        this.heaterStatus = true;
        this.targetTemp = temp;
        console.log(`🔥 Heater turned ON - Target temperature: ${temp}°C`);
        return { status: "on", targetTemp: temp };
    }

    async heaterOff() {
        this.heaterStatus = false;
        console.log(`❄️  Heater turned OFF`);
        return { status: "off" };
    }

    async coolerOn(input) {
        let temp = input;
        if (typeof input?.value === 'function') temp = await input.value();
        this.coolerStatus = true;
        this.targetTemp = temp;
        console.log(`❄️  Cooler turned ON - Target temperature: ${temp}°C`);
        return { status: "on", targetTemp: temp };
    }

    async coolerOff() {
        this.coolerStatus = false;
        console.log(`🔥 Cooler turned OFF`);
        return { status: "off" };
    }

    async dispenseChemical(input) {
        let val = input;
        if (typeof input?.value === 'function') val = await input.value();
        const { chemical, amount } = val || {};
        console.log(`🧪 Dispensing ${amount} units of ${chemical}`);
        return { status: "dispensed", chemical, amount };
    }
}

const port = 9109;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated TankActuators Device starting...');
    const tankActuators = new TankActuators();
    const thing = await WoT.produce({
        title: "TankActuators",
        description: "Simulated tank actuators device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            heaterOn: {
                title: "Heater On",
                description: "Turns the water heater on",
                input: { type: "number", description: "The target temperature of the water" },
                output: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        targetTemp: { type: "number" }
                    }
                }
            },
            heaterOff: {
                title: "Heater Off",
                description: "Turns the water heater off",
                output: {
                    type: "object",
                    properties: {
                        status: { type: "string" }
                    }
                }
            },
            coolerOn: {
                title: "Cooler On",
                description: "Turns the water cooler on",
                input: { type: "number", description: "The target temperature of the water" },
                output: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        targetTemp: { type: "number" }
                    }
                }
            },
            coolerOff: {
                title: "Cooler Off",
                description: "Turns the water cooler off",
                output: {
                    type: "object",
                    properties: {
                        status: { type: "string" }
                    }
                }
            },
            dispenseChemical: {
                title: "Dispense Chemical",
                description: "Dispenses the specified chemical into the water tank",
                input: {
                    type: "object",
                    properties: {
                        chemical: { type: "string", description: "The chemical to release into the water" },
                        amount: { type: "number", description: "The amount of the specified chemical to be released" }
                    }
                },
                output: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        chemical: { type: "string" },
                        amount: { type: "number" }
                    }
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("heaterOn", tankActuators.heaterOn.bind(tankActuators));
    thing.setActionHandler("heaterOff", tankActuators.heaterOff.bind(tankActuators));
    thing.setActionHandler("coolerOn", tankActuators.coolerOn.bind(tankActuators));
    thing.setActionHandler("coolerOff", tankActuators.coolerOff.bind(tankActuators));
    thing.setActionHandler("dispenseChemical", tankActuators.dispenseChemical.bind(tankActuators));
    await thing.expose();
    console.log(`TankActuators exposed at http://localhost:${port}/tankactuators`);
    // Register TD with TDD
    const td = await thing.getThingDescription();
    try {
        await fetch('http://localhost:9101/things', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(td)
        });
    } catch (err) {
        console.warn('Could not register TD with TDD:', err.message);
    }
});
