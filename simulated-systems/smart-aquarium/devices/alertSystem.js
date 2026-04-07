import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class AlertSystem {
    async alertRole({ role, message }) {
        console.log(`⚠️  Alert sent to role '${role}': ${message}`);
    }
}
export default AlertSystem;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 9101 }));

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
        console.log('AlertSystem exposed at http://localhost:9101/alertsystem');
    });
}