
// devices/speaker.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class SpeakerSimulator {
    constructor() {
        this.volume = 50;
    }
    async setVolume(input) {
        // Try to extract percentage from different possible input shapes
        let percentage = undefined;
        if (input && typeof input === "object") {
            if (typeof input.percentage === "number") {
                percentage = input.percentage;
            } else if (input.data && typeof input.data.percentage === "number") {
                percentage = input.data.percentage;
            }
        }
        // console.log('setVolume resolved percentage:', percentage);
        if (typeof percentage === "number" && percentage >= 0 && percentage <= 100) {
            this.volume = percentage;
            console.log(`Speaker volume set to ${this.volume}%`);
            return this.volume;
        }
        throw new Error("Invalid volume percentage");
    }
    async getVolume() {
        // console.log(`🔊 Speaker volume requested: ${this.volume}%`);
        return this.volume;
    }
}

const port = 8109;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new SpeakerSimulator();
    const thing = await WoT.produce({
        title: "Speaker",
        description: "Simulated speaker device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            setVolume: {
                title: "Set volume",
                description: "Sets the volume of this speaker",
                input: {
                    type: "object",
                    properties: {
                        percentage: {
                            type: "integer",
                            description: "The volume percentage to set this speaker to"
                        }
                    }
                },
                output: { type: 'integer' }
            },
            getVolume: {
                title: "Get volume",
                description: "Gets the volume of this speaker",
                output: {
                    type: "integer"
                }
            }
        },
        events: {}
    });
    thing.setActionHandler("getVolume", sim.getVolume.bind(sim));
    thing.setActionHandler("setVolume", async (interaction) => {
        // Extract the actual JSON data from the interaction output
        const input = await interaction.value();
        // console.log('Parsed input data:', input);
        return sim.setVolume(input);
    });

    await thing.expose();
    console.log(`Speaker exposed at http://localhost:${port}/speaker`);
    const td = await thing.getThingDescription();
    try {
        await fetch('http://localhost:8101/things', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(td)
        });
    } catch (err) {
        console.warn('Could not register TD with TDD:', err.message);
    }
});