import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8081 }));
servient.start().then(async (WoT) => {
    console.log('Simulated Lamp Device starting...');
    const thing = await WoT.produce({
        title: "mylamp",
        id: "uri:lamp123",
        description: "A web connected led",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": [
            "OnOffSwitch",
            "Light"
        ],
        properties: {
            state: {
                type: "boolean",
                title: "On/Off",
                description: "Whether the lamp is turned on",
                "@type": "iot:OnOffProperty"
            }
        },
        actions: {
            toggle: {
                title: "Toggle",
                description: "toggle the lamp on/off",
                "@type": "ToggleAction",
                input: {
                    type: "boolean"
                }
            }
        }
    });
    // Internal state
    let lampState = false;
    // Property Handlers
    thing.setPropertyReadHandler("state", async () => {
        return lampState;
    });
    thing.setPropertyWriteHandler("state", async (val) => {
        const value = await val.value();
        if (typeof value === 'boolean') {
            lampState = value;
            console.log(`Lamp state set to: ${lampState ? 'ON' : 'OFF'}`);
        }
    });
    // Action Handlers
    thing.setActionHandler("toggle", async (params) => {
        const input = await params.value();
        if (typeof input === 'boolean') {
            // If boolean input is provided, set the state directly
            lampState = input;
        }
        else {
            // If no input or invalid, just toggle
            lampState = !lampState;
        }
        console.log(`Action toggle called. New state: ${lampState ? 'ON' : 'OFF'}`);
        // Emit property change event (optional but good practice)
        // thing.emitPropertyChange("state");
        return undefined;
    });
    await thing.expose();
    console.log('My Lamp exposed at http://localhost:8081/mylamp');
});