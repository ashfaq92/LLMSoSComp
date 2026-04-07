import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class SmartAssistant {
    async say({ phrase }) {
        console.log(`SmartAssistant says: "${phrase}"`);
        return { phrase };
    }
}

export default SmartAssistant;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8089 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated SmartAssistant Device starting...');
        const assistant = new SmartAssistant();
        const thing = await WoT.produce({
            title: "SmartAssistant",
            "@context": [
                "https://www.w3.org/2022/wot/td/v1.1"
            ],
            "@type": ["Thing"],
            securityDefinitions: {
                no_sec: { scheme: "nosec" }
            },
            security: ["no_sec"],
            properties: {},
            actions: {
                say: {
                    title: "Say phrase",
                    description: "Makes the assistant say the given phrase",
                    input: {
                        type: "object",
                        properties: {
                            phrase: {
                                type: "string",
                                description: "The phrase to be spoken by this assistant"
                            }
                        }
                    },
                    output: {
                        type: "object",
                        properties: {
                            phrase: {
                                type: "string",
                                description: "The phrase spoken by this assistant"
                            }
                        }
                    }
                }
            },
            events: {}
        });

        thing.setActionHandler("say", assistant.say.bind(assistant));

        await thing.expose();
        console.log('SmartAssistant exposed at http://localhost:8089/smartassistant');
    });
}