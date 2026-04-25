
// devices/mainRoomLight.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class MainRoomLightSimulator {
    async lightOn() {
        console.log("💡 MainRoomLight turned ON.");
    }
    async lightOff() {
        console.log("💡 MainRoomLight turned OFF.");
    }
}

const port = 8106;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    const sim = new MainRoomLightSimulator();
    const thing = await WoT.produce({
        title: "MainRoomLight",
        description: "Simulated main room light device",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
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
    thing.setActionHandler("lightOn", sim.lightOn.bind(sim));
    thing.setActionHandler("lightOff", sim.lightOff.bind(sim));
    await thing.expose();
    console.log(`MainRoomLight exposed at http://localhost:${port}/mainroomlight`);
    const td = await thing.getThingDescription();
    await fetch('http://localhost:8101/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(td)
    });
});