import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9110 }));

servient.start().then(async (WoT) => {
    console.log('Simulated TankCameras Device starting...');
    const thing = await WoT.produce({
        title: "TankCameras",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            getCameraConnection: {
                title: "Get Camera Connection",
                description: "Fetches a connection to the tank camera feed",
                output: {
                    title: "string",
                    description: "Details of the camera feed connection"
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("getCameraConnection", async () => {
        const connectionDetails = {
            streamUrl: "rtsp://localhost:8554/camera-feed",
            resolution: "1920x1080",
            fps: 30,
            codec: "h264"
        };
        console.log("📷 Camera connection requested. Connection details provided.");
        return JSON.stringify(connectionDetails);
    });

    await thing.expose();
    console.log('TankCameras exposed at http://localhost:9110/tankcameras');
});
