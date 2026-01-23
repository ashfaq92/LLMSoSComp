
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8080 }));
servient.start().then(async (WoT) => {
    console.log('Simulated HTTP Device starting...');
    const thing = await WoT.produce({
        title: "HttpThermostat",
        description: "A simulated thermostat accessible via HTTP",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1",
            { "iot": "http://iotschema.org/" }
        ],
        "@type": "iot:Thermostat",
        properties: {
            temperature: {
                "@type": "iot:CurrentTemperature",
                type: "number",
                description: "Current temperature reading",
                readOnly: true,
                observable: true,
                unit: "Celsius"
            },
            targetTemperature: {
                "@type": "iot:TargetTemperature",
                type: "number",
                description: "Desired target temperature",
                minimum: 15,
                maximum: 30,
                unit: "Celsius"
            },
            overheatThreshold: {
                type: "number",
                description: "Temperature threshold that triggers overheating event",
                minimum: 20,
                maximum: 40,
                unit: "Celsius"
            }
        },
        actions: {
            setTemperature: {
                description: "Set the target temperature",
                input: {
                    type: "number",
                    minimum: 15,
                    maximum: 30,
                    unit: "Celsius"
                }
            }
        },
        events: {
            overheating: {
                description: "Emitted when the temperature exceeds the overheat threshold",
                data: {
                    type: "object",
                    properties: {
                        temperature: { type: "number", unit: "Celsius" },
                        threshold: { type: "number", unit: "Celsius" }
                    }
                }
            }
        }
    });
    let temp = 20;
    let target = 22;
    let overheatThreshold = 28;
    thing.setPropertyReadHandler("temperature", async () => temp);
    thing.setPropertyReadHandler("targetTemperature", async () => target);
    thing.setPropertyWriteHandler("targetTemperature", async (val) => {
        target = (await val.value());
        console.log(`Target temperature set to ${target}`);
    });
    thing.setPropertyReadHandler("overheatThreshold", async () => overheatThreshold);
    thing.setPropertyWriteHandler("overheatThreshold", async (val) => {
        overheatThreshold = (await val.value());
        console.log(`Overheat threshold set to ${overheatThreshold}`);
    });
    thing.setActionHandler("setTemperature", async (params) => {
        const val = await params.value();
        target = val;
        console.log(`Action setTemperature called with ${target}`);
        return undefined;
    });
    await thing.expose();
    console.log('HttpThermostat exposed at http://localhost:8080/httpthermostat');
    // Simulate temp change
    setInterval(() => {
        if (temp < target)
            temp += 0.5;
        else if (temp > target)
            temp -= 0.5;
        // Emit overheating event if threshold exceeded
        if (temp > overheatThreshold) {
            thing.emitEvent("overheating", { temperature: temp, threshold: overheatThreshold });
            console.log(`⚠️ OVERHEATING! Temperature ${temp.toFixed(1)}°C exceeds threshold ${overheatThreshold}°C`);
        }
        // thing.emitPropertyChange("temperature");
        console.log(`Current temperature: ${temp.toFixed(1)}°C`);
    }, 2000);
});
