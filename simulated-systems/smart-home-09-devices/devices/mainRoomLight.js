import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class MainRoomLight {
    async lightOn() {
        console.log("💡 MainRoomLight turned ON.");
    }
    async lightOff() {
        console.log("💡 MainRoomLight turned OFF.");
    }
}

export default MainRoomLight;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 8087 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated MainRoomLight Device starting...');
        const mainRoomLight = new MainRoomLight();
        const thing = await WoT.produce({
            title: "MainRoomLight",
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
        await thing.expose();
        console.log('MainRoomLight exposed at http://localhost:8087/mainroomlight');
        thing.setActionHandler("lightOn", mainRoomLight.lightOn.bind(mainRoomLight));
        thing.setActionHandler("lightOff", mainRoomLight.lightOff.bind(mainRoomLight));
    });
}