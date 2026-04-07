import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class TankActuators {
    constructor() {
        this.heaterStatus = false;
        this.coolerStatus = false;
        this.targetTemp = 25;
    }

    async heaterOn(temperature) {
        this.heaterStatus = true;
        this.targetTemp = temperature;
        console.log(`🔥 Heater turned ON - Target temperature: ${temperature}°C`);
    }

    async heaterOff() {
        this.heaterStatus = false;
        console.log(`❄️  Heater turned OFF`);
    }

    async coolerOn(temperature) {
        this.coolerStatus = true;
        this.targetTemp = temperature;
        console.log(`❄️  Cooler turned ON - Target temperature: ${temperature}°C`);
    }

    async coolerOff() {
        this.coolerStatus = false;
        console.log(`🔥 Cooler turned OFF`);
    }

    async dispenseChemical(input) {
        const { chemical, amount } = input;
        console.log(`🧪 Dispensing ${amount} units of ${chemical}`);
    }
}

export default TankActuators;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 9109 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated TankActuators Device starting...');
        const tankActuators = new TankActuators();
        const thing = await WoT.produce({
            title: "TankActuators",
            "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
            "@type": ["Thing"],
            securityDefinitions: { no_sec: { scheme: "nosec" } },
            security: ["no_sec"],
            properties: {},
            actions: {
                heaterOn: {
                    title: "Heater On",
                    description: "Turns the water heater on",
                    input: { type: "number", description: "The target temperature of the water" }
                },
                heaterOff: {
                    title: "Heater Off",
                    description: "Turns the water heater off"
                },
                coolerOn: {
                    title: "Cooler On",
                    description: "Turns the water cooler on",
                    input: { type: "number", description: "The target temperature of the water" }
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
                            chemical: { type: "string", description: "The chemical to release into the water" },
                            amount: { type: "number", description: "The amount of the specified chamical to be released" }
                        }
                    }
                }
            },
            events: {}
        });

        thing.setActionHandler("heaterOn", async (input) => {
            // If invoked from WoT, input may be an InteractionOutput
            let temp = input;
            if (typeof input?.value === 'function') temp = await input.value();
            return tankActuators.heaterOn(temp);
        });
        thing.setActionHandler("heaterOff", tankActuators.heaterOff.bind(tankActuators));
        thing.setActionHandler("coolerOn", async (input) => {
            let temp = input;
            if (typeof input?.value === 'function') temp = await input.value();
            return tankActuators.coolerOn(temp);
        });
        thing.setActionHandler("coolerOff", tankActuators.coolerOff.bind(tankActuators));
        thing.setActionHandler("dispenseChemical", async (input) => {
            let val = input;
            if (typeof input?.value === 'function') val = await input.value();
            return tankActuators.dispenseChemical(val);
        });
        await thing.expose();
        console.log('TankActuators exposed at http://localhost:9109/tankactuators');
    });
}
