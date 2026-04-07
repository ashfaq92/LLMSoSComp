import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class TankSensors {
    constructor() {
        this.minPH = 0;
        this.maxPH = 15;
        this.pHLevel = this.minPH + Math.random() * (this.maxPH - this.minPH);
        this.temperature = 25 + (Math.random() - 0.5) * 2;
        this.salinity = 1.020 + (Math.random() - 0.5) * 0.005;
        this.nitrateLevel = 20 + Math.random() * 10;
        this.thing = null;
        this._interval = null;
    }

    setThing(thing) {
        this.thing = thing;
    }

    getPHLevel() { return this.pHLevel; }
    getTemperature() { return this.temperature; }
    getSalinity() { return this.salinity; }
    getNitrateLevel() { return this.nitrateLevel; }

    startEmittingReadings() {
        this._interval = setInterval(() => {
            this.pHLevel = this.minPH + Math.random() * (this.maxPH - this.minPH);
            this.temperature = Math.max(20, Math.min(30, this.temperature + (Math.random() - 0.5) * 0.5));
            this.salinity = Math.max(1.015, Math.min(1.025, this.salinity + (Math.random() - 0.5) * 0.001));
            this.nitrateLevel = Math.max(0, this.nitrateLevel + (Math.random() - 0.5) * 1);
            if (this.thing) {
                this.thing.emitEvent("pHLevel", this.pHLevel);
                this.thing.emitEvent("temperature", this.temperature);
                this.thing.emitEvent("salinity", this.salinity);
                this.thing.emitEvent("nitrateLevel", this.nitrateLevel);
            }
            console.log(`📊 Sensor readings - pH: ${this.pHLevel.toFixed(2)}, Temp: ${this.temperature.toFixed(1)}°C, Salinity: ${this.salinity.toFixed(3)}, Nitrate: ${this.nitrateLevel.toFixed(1)}`);
        }, 3000);
    }

    stopEmittingReadings() {
        if (this._interval) clearInterval(this._interval);
    }
}

export default TankSensors;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 9112 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated TankSensors Device starting...');
        const tankSensors = new TankSensors();
        const thing = await WoT.produce({
            title: "TankSensors",
            "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
            "@type": ["Thing"],
            securityDefinitions: { no_sec: { scheme: "nosec" } },
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
                    data: { type: "number" }
                },
                temperature: {
                    title: "Temperature",
                    description: "A periodic notification of the current water temperature of the tank",
                    data: { type: "number" }
                },
                salinity: {
                    title: "Salinity",
                    description: "The current concentration of salt in the tank's water",
                    data: { type: "number" }
                },
                nitrateLevel: {
                    title: "Nitrate Level",
                    description: "Notification of the current amount of nitrate in the tank water",
                    data: { type: "number" }
                }
            }
        });

        tankSensors.setThing(thing);
        thing.setPropertyReadHandler("pHLevel", () => tankSensors.getPHLevel());
        thing.setPropertyReadHandler("temperature", () => tankSensors.getTemperature());
        thing.setPropertyReadHandler("salinity", () => tankSensors.getSalinity());
        thing.setPropertyReadHandler("nitrateLevel", () => tankSensors.getNitrateLevel());
        await thing.expose();
        console.log('TankSensors exposed at http://localhost:9112/tanksensors');
        tankSensors.startEmittingReadings();
    });
}
