
// devices/smartAssistant.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class SmartAssistantSimulator {
    async say({ phrase }) {
        console.log(`SmartAssistant says: "${phrase}"`);
        return { phrase };
    }
}


const port = 8108
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new SmartAssistantSimulator();
    const thing = await WoT.produce({
        title: "SmartAssistant",
        description: "Simulated smart assistant device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
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
    // thing.setActionHandler("say", sim.say.bind(sim));
    thing.setActionHandler("say", async (interaction) => {
        const input = await interaction.value();
        // console.log('Parsed input data:', input);
        return sim.say(input);
    });

    await thing.expose();
    console.log(`SmartAssistant exposed at http://localhost:${port}/smartassistant`);
    const td = await thing.getThingDescription();
    await fetch('http://localhost:8101/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(td)
    });
});