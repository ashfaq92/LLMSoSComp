import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8090 }));

servient.start().then(async (WoT) => {
    console.log('Simulated Speaker Device starting...');
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
                }
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

    let volume = 50; // Default volume

    await thing.expose();
    console.log('Speaker exposed at http://localhost:8090/speaker');

    thing.setActionHandler("setVolume", async (params) => {
        const input = await params.value();
        if (typeof input.percentage === "number" && input.percentage >= 0 && input.percentage <= 100) {
            volume = input.percentage;
            console.log(`🔊 Speaker volume set to ${volume}%`);
        } else {
            console.log("Invalid volume percentage received.");
        }
        return undefined;
    });

    thing.setActionHandler("getVolume", async () => {
        console.log(`🔊 Speaker volume requested: ${volume}%`);
        return volume;
    });
});