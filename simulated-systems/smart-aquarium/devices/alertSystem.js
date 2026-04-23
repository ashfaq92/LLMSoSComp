import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class AlertSystem {
    async alertRole({ role, message }) {
        console.log(`⚠️  Alert sent to role '${role}': ${message}`);
    }
}

const port = 9102;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated AlertSystem Device starting...');
    const alertSystem = new AlertSystem();
    const thing = await WoT.produce({
        title: "AlertSystem",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            alertRole: {
                title: "Alert Role",
                description: "Alerts a system role with the provided message/data",
                input: {
                    type: "object",
                    properties: {
                        role: { type: "string" },
                        message: { type: "string" }
                    }
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("alertRole", alertSystem.alertRole.bind(alertSystem));
    await thing.expose();
    console.log(`AlertSystem exposed at http://localhost:${port}/alertsystem`);

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