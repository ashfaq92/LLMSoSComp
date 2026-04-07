 import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class Speaker {
    constructor() {
        this.volume = 50;
    }

    async setVolume({ percentage }) {
        if (typeof percentage === "number" && percentage >= 0 && percentage <= 100) {
            this.volume = percentage;
            console.log(`Speaker volume set to ${this.volume}%`);
            return this.volume;
        }
        throw new Error("Invalid volume percentage");
    }

    async getVolume() {
        console.log(`🔊 Speaker volume requested: ${this.volume}%`);
        return this.volume;
    }
}

export default Speaker;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
   
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8090 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated Speaker Device starting...');
        const speaker = new Speaker();
        const thing = await WoT.produce({
            title: "Speaker",
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

        thing.setActionHandler("setVolume", speaker.setVolume.bind(speaker));
        thing.setActionHandler("getVolume", speaker.getVolume.bind(speaker));

        await thing.expose();
        console.log('Speaker exposed at http://localhost:8090/speaker');
    });
}