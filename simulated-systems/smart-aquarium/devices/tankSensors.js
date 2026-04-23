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

    async getPHLevel() { return { pHLevel: this.pHLevel }; }
    async getTemperature() { return { temperature: this.temperature }; }
    async getSalinity() { return { salinity: this.salinity }; }
    async getNitrateLevel() { return { nitrateLevel: this.nitrateLevel }; }

    emitEventSafely(eventName, payload) {
        if (!this.thing) return;
        Promise.resolve(this.thing.emitEvent(eventName, payload)).catch((err) => {
            console.warn(`TankSensors: Failed to emit "${eventName}" event: ${err?.message || err}`);
        });
    }

    startEmittingReadings() {
        this._interval = setInterval(() => {
            this.pHLevel = this.minPH + Math.random() * (this.maxPH - this.minPH);
            this.temperature = Math.max(10, Math.min(35, this.temperature + (Math.random() - 0.5) * 0.5));
            this.salinity = Math.max(1.015, Math.min(1.025, this.salinity + (Math.random() - 0.5) * 0.001));
            this.nitrateLevel = Math.max(0, this.nitrateLevel + (Math.random() - 0.5) * 1);
            if (this.thing) {
                this.emitEventSafely("pHLevel", { pHLevel: this.pHLevel });
                this.emitEventSafely("temperature", { temperature: this.temperature });
                this.emitEventSafely("salinity", { salinity: this.salinity });
                this.emitEventSafely("nitrateLevel", { nitrateLevel: this.nitrateLevel });
            }
            console.log(`📊 Sensor readings - pH: ${this.pHLevel.toFixed(2)}, Temp: ${this.temperature.toFixed(1)}°C, Salinity: ${this.salinity.toFixed(3)}, Nitrate: ${this.nitrateLevel.toFixed(1)}`);
        }, 3000);
    }

    stopEmittingReadings() {
        if (this._interval) clearInterval(this._interval);
    }
}

export default TankSensors;

const port = 9112
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated TankSensors Device starting...');
    const tankSensors = new TankSensors();
    const thing = await WoT.produce({
        title: "TankSensors",
        description: "Simulated tank sensors device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {
            pHLevel: {
                type: "object",
                title: "pH level",
                description: "The pH Level of the water in the tank",
                properties: { pHLevel: { type: "number" } }
            },
            temperature: {
                type: "object",
                title: "Temperature",
                description: "The temperature of the water in the tank",
                properties: { temperature: { type: "number" } }
            },
            salinity: {
                type: "object",
                title: "Salinity",
                description: "The salinity of the water in the tank",
                properties: { salinity: { type: "number" } }
            },
            nitrateLevel: {
                type: "object",
                title: "Nitrate Level",
                description: "The amount of nitrates in the tank's water",
                properties: { nitrateLevel: { type: "number" } }
            }
        },
        actions: {},
        events: {
            pHLevel: {
                title: "pH Level",
                description: "A periodic report of the pH level of the tank's water",
                data: {
                    type: "object",
                    properties: { pHLevel: { type: "number" } }
                }
            },
            temperature: {
                title: "Temperature",
                description: "A periodic notification of the current water temperature of the tank",
                data: {
                    type: "object",
                    properties: { temperature: { type: "number" } }
                }
            },
            salinity: {
                title: "Salinity",
                description: "The current concentration of salt in the tank's water",
                data: {
                    type: "object",
                    properties: { salinity: { type: "number" } }
                }
            },
            nitrateLevel: {
                title: "Nitrate Level",
                description: "Notification of the current amount of nitrate in the tank water",
                data: {
                    type: "object",
                    properties: { nitrateLevel: { type: "number" } }
                }
            }
        }
    });

    tankSensors.setThing(thing);
    thing.setPropertyReadHandler("pHLevel", tankSensors.getPHLevel.bind(tankSensors));
    thing.setPropertyReadHandler("temperature", tankSensors.getTemperature.bind(tankSensors));
    thing.setPropertyReadHandler("salinity", tankSensors.getSalinity.bind(tankSensors));
    thing.setPropertyReadHandler("nitrateLevel", tankSensors.getNitrateLevel.bind(tankSensors));
    await thing.expose();
    console.log(`TankSensors exposed at http://localhost:${port}/tanksensors`);
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
    tankSensors.startEmittingReadings();
});
