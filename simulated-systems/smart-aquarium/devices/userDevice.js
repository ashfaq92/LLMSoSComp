import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9113 }));

servient.start().then(async (WoT) => {
    console.log('Simulated UserDevice Device starting...');
    const thing = await WoT.produce({
        title: "UserDevice",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            receiveWaterConditions: {
                title: "Receive Water Conditions",
                description: "Passes the given water conditions to the user of this device"
            },
            receiveCameraConnection: {
                title: "Receive Camera Connection",
                description: "Passes details to the user's application for establishing a camera connection",
                input: {
                    type: "string",
                    description: "Details for establishing a camera connection"
                }
            }
        },
        events: {
            requestWaterConditions: {
                title: "Request Water Conditions",
                description: "An event produced when a user wishes to gather the current water conditions",
                data: { type: "null" }
            },
            accessCameraFeed: {
                title: "Access Camera Feed",
                description: "An event displaying the users intention to access the aquarium's camera system",
                data: { type: "null" }
            },
            uploadLightingProfile: {
                title: "Upload Lighting Profile",
                description: "An event made when the user wishes to establish a new lighting profile",
                data: {
                    type: "string",
                    description: "The new lighting profile"
                }
            },
            forceFoodDispense: {
                title: "Force Food Dispense",
                description: "Notification made when the user wishes to dispense food into the tank",
                data: {
                    type: "number",
                    description: "The amount of food to dispense"
                }
            }
        }
    });

    thing.setActionHandler("receiveWaterConditions", async (input) => {
        console.log(input);
        return null;
    });

    thing.setActionHandler("receiveCameraConnection", async (connectionDetails) => {
        console.log(`📱 User device received camera connection: ${connectionDetails}`);
        return null;
    });

    await thing.expose();
    console.log('UserDevice exposed at http://localhost:9113/userdevice');

    // Simulate user interactions
    const simulateUserInteraction = () => {
        const delay = Math.random() * 10000 + 5000; // 5-15 seconds
        setTimeout(() => {
            const interactions = [
                "requestWaterConditions",
                "accessCameraFeed",
                "uploadLightingProfile",
                "forceFoodDispense"
            ];
            const interaction = interactions[Math.floor(Math.random() * interactions.length)];
            
            if (interaction === "requestWaterConditions") {
                thing.emitEvent("requestWaterConditions", null);
                console.log("👤 User requested water conditions");
            } else if (interaction === "accessCameraFeed") {
                thing.emitEvent("accessCameraFeed", null);
                console.log("👤 User accessing camera feed");
            } else if (interaction === "uploadLightingProfile") {
                const profiles = ["natural", "moonlight", "feeding", "actinic"];
                const profile = profiles[Math.floor(Math.random() * profiles.length)];
                thing.emitEvent("uploadLightingProfile", profile);
                console.log(`👤 User uploaded lighting profile: ${profile}`);
            } else if (interaction === "forceFoodDispense") {
                const amount = Math.floor(Math.random() * 50) + 10;
                thing.emitEvent("forceFoodDispense", amount);
                console.log(`👤 User requested food dispense: ${amount} units`);
            }
            
            simulateUserInteraction();
        }, delay);
    };
    simulateUserInteraction();
});
