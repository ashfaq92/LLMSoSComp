import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9111 }));

servient.start().then(async (WoT) => {
    console.log('Simulated TankLighting Device starting...');
    let lightingProfile = "natural";
    let brightness = 50;

    const thing = await WoT.produce({
        title: "TankLighting",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            alterLightingProfile: {
                title: "Alter Lighting Profile",
                description: "Alters the profile of the lighting strength against time",
                input: {
                    type: "string",
                    description: "The new lighting profile"
                }
            },
            resetLightingProfile: {
                title: "Reset Lighting Profile",
                description: "Resets the lighting profile for the tank lights"
            },
            notifyLightingOfTime: {
                title: "Notify Lighting Of Time",
                description: "Notifies this lighting unit of the current time (enabling synchronisation by an external time keeper)",
                input: {
                    type: "number",
                    description: "The current time"
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("alterLightingProfile", async (profile) => {
        lightingProfile = profile;
        console.log(`💡 Lighting profile changed to: ${profile}`);
        return null;
    });

    thing.setActionHandler("resetLightingProfile", async () => {
        lightingProfile = "natural";
        brightness = 50;
        console.log(`🔄 Lighting profile reset to default (natural)`);
        return null;
    });

    thing.setActionHandler("notifyLightingOfTime", async (time) => {
        // Simulate brightness changes based on time of day
        const hour = new Date(time).getHours();
        brightness = Math.max(10, 100 - Math.abs(hour - 12) * 5);
        console.log(`🕐 Time synchronized. Hour: ${hour}, Brightness adjusted to: ${brightness}%`);
        return null;
    });

    await thing.expose();
    console.log('TankLighting exposed at http://localhost:9111/tanklighting');
});
