import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8089 }));

servient.start().then(async (WoT) => {
    console.log('Simulated SmartAssistant Device starting...');
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

    await thing.expose();
    console.log('SmartAssistant exposed at http://localhost:8089/smartassistant');

    thing.setActionHandler("say", async (params) => {
        const input = params && typeof params.value === "function" ? await params.value() : params;
        const phrase = input?.phrase || '';
        console.log(`SmartAssistant says: "${phrase}"`);
        return { "phrase": phrase };
    });
});