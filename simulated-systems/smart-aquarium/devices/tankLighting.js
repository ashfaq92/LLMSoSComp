import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';


class TankLighting {
    constructor() {
        this.lightingProfile = "natural";
        this.brightness = 50;
    }

    async alterLightingProfile(input) {
        let profile = input;
        if (typeof input?.value === 'function') profile = await input.value();
        this.lightingProfile = profile;
        console.log(`Lighting profile changed to: ${this.lightingProfile}`);
        return { lightingProfile: this.lightingProfile };
    }

    async resetLightingProfile() {
        this.lightingProfile = "natural";
        this.brightness = 50;
        console.log("Lighting profile reset to natural, brightness 50%");
        return { lightingProfile: this.lightingProfile, brightness: this.brightness };
    }

    async notifyLightingOfTime(input) {
        let time = input;
        if (typeof input?.value === 'function') time = await input.value();
        const hour = new Date(time).getHours();
        this.brightness = Math.max(10, 100 - Math.abs(hour - 12) * 5);
        console.log(`🕐 Time synchronized. Hour: ${hour}, Brightness adjusted to: ${this.brightness}%`);
        return { brightness: this.brightness };
    }
}

export default TankLighting;


const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const port = 9111;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated TankLighting Device starting...');
    const tankLighting = new TankLighting();
    const thing = await WoT.produce({
        title: "TankLighting",
        description: "Simulated tank lighting device",
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
                output: {
                    type: "object",
                    properties: {
                        lightingProfile: { type: "string" }
                    }
                }
            },
            resetLightingProfile: {
                title: "Reset Lighting Profile",
                description: "Resets the lighting profile for the tank lights",
                output: {
                    type: "object",
                    properties: {
                        lightingProfile: { type: "string" },
                        brightness: { type: "number" }
                    }
                }
            },
            notifyLightingOfTime: {
                title: "Notify Lighting Of Time",
                description: "Notifies this lighting unit of the current time",
                input: { type: "number" },
                output: {
                    type: "object",
                    properties: {
                        brightness: { type: "number" }
                    }
                }
            }
        },
        events: {}
    });

    thing.setActionHandler("alterLightingProfile", tankLighting.alterLightingProfile.bind(tankLighting));
    thing.setActionHandler("resetLightingProfile", tankLighting.resetLightingProfile.bind(tankLighting));
    thing.setActionHandler("notifyLightingOfTime", tankLighting.notifyLightingOfTime.bind(tankLighting));

    await thing.expose();
    console.log(`TankLighting exposed at http://localhost:${port}/tanklighting`);
    // Register TD with TDD
    const td = await thing.getThingDescription();
    try {
        await fetch('http://localhost:9101/things', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(td)
        });
    } catch (err) {
        console.warn('Could not register TD with TDD:', err.message);
    }
});