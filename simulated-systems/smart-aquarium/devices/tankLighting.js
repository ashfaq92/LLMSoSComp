import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class TankLighting {
    constructor() {
        this.lightingProfile = "natural";
        this.brightness = 50;
    }

    async alterLightingProfile(profile) {
        this.lightingProfile = profile;
        console.log(`Lighting profile changed to: ${this.lightingProfile}`);
        return this.lightingProfile;
    }

    async resetLightingProfile() {
        this.lightingProfile = "natural";
        this.brightness = 50;
        console.log("Lighting profile reset to natural, brightness 50%");
    }

    async notifyLightingOfTime(time) {
        const hour = new Date(time).getHours();
        this.brightness = Math.max(10, 100 - Math.abs(hour - 12) * 5);
        console.log(`🕐 Time synchronized. Hour: ${hour}, Brightness adjusted to: ${this.brightness}%`);
    }
}

export default TankLighting;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 9111 }));

    servient.start().then(async (WoT) => {
        console.log('Simulated TankLighting Device starting...');
        const tankLighting = new TankLighting();
        const thing = await WoT.produce({
            title: "TankLighting",
            "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
            "@type": ["Thing"],
            securityDefinitions: { no_sec: { scheme: "nosec" } },
            security: ["no_sec"],
            properties: {},
            actions: {
                alterLightingProfile: {
                    title: "Alter Lighting Profile",
                    description: "Alters the profile of the lighting strength against time",
                    input: { type: "string" },
                    output: { type: "string" }
                },
                resetLightingProfile: {
                    title: "Reset Lighting Profile",
                    description: "Resets the lighting profile for the tank lights"
                },
                notifyLightingOfTime: {
                    title: "Notify Lighting Of Time",
                    description: "Notifies this lighting unit of the current time",
                    input: { type: "number" }
                }
            },
            events: {}
        });

        thing.setActionHandler("alterLightingProfile", ({ value }) => tankLighting.alterLightingProfile(value));
        thing.setActionHandler("resetLightingProfile", () => tankLighting.resetLightingProfile());
        thing.setActionHandler("notifyLightingOfTime", ({ value }) => tankLighting.notifyLightingOfTime(value));

        await thing.expose();
        console.log('TankLighting exposed at http://localhost:9111/tanklighting');
    });
}