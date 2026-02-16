import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9101 }));

servient.start().then(async (WoT) => {
    console.log('Simulated AlertSystem Device starting...');
    const thing = await WoT.produce({
        title: "AlertSystem",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            alertRole: {
                title: "Alert Role",
                description: "Alerts a system role with the provided message/data",
                input: {
                    type: "object",
                    properties: {
                        role: {
                            type: "string",
                            description: "The system role to be alerted"
                        },
                        message: {
                            type: "string",
                            description: "the message to be sent to the given role"
                        }
                    }
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("alertRole", async (input) => {
        const { role, message } = input;
        console.log(`⚠️  Alert sent to role '${role}': ${message}`);
        return null;
    });

    await thing.expose();
    console.log('AlertSystem exposed at http://localhost:9101/alertsystem');
});
