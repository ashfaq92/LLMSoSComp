import { Servient } from '@node-wot/core';
import * as coapBinding from '@node-wot/binding-coap';
const CoapServer = coapBinding.CoapServer || coapBinding.default?.CoapServer;
const servient = new Servient();
servient.addServer(new CoapServer({ port: 5683 }));
servient.start().then(async (WoT) => {
    console.log('Simulated CoAP Device starting...');
    const thing = await WoT.produce({
        title: "CoapLight",
        description: "A simulated light accessible via CoAP",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        properties: {
            status: {
                type: "boolean",
                observable: true
            }
        },
        actions: {
            toggle: {}
        }
    });
    let status = false;
    thing.setPropertyReadHandler("status", async () => status);
    thing.setPropertyWriteHandler("status", async (val) => {
        status = (await val.value());
        console.log(`Light status set to ${status}`);
    });
    thing.setActionHandler("toggle", async () => {
        status = !status;
        console.log(`Light toggled to ${status}`);
        thing.emitPropertyChange("status");
        return undefined;
    });
    await thing.expose();
    console.log('CoapLight exposed at coap://localhost:5683/coaplight');
});
