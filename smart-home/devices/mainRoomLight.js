import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8087 }));

servient.start().then(async (WoT) => {
    console.log('Simulated MainRoomLight Device starting...');
    const thing = await WoT.produce({
        title: "MainRoomLight",
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
            lightOn: {
                title: "Turn light on",
                description: "Turns the light on"
            },
            lightOff: {
                title: "Turn light off",
                description: "Turns the light off"
            }
        },
        events: {}
    });

    await thing.expose();
    console.log('MainRoomLight exposed at http://localhost:8087/mainroomlight');

    thing.setActionHandler("lightOn", async () => {
        console.log("💡 MainRoomLight turned ON.");
        return undefined;
    });

    thing.setActionHandler("lightOff", async () => {
        console.log("💡 MainRoomLight turned OFF.");
        return undefined;
    });
});