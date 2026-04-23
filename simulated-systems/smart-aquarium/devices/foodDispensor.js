import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class FoodDispensor {
    constructor() {
        this.foodLevel = 100;
        this.thing = null;
    }

    setThing(thing) {
        this.thing = thing;
    }

    async dispenseFood(amount) {
        this.foodLevel = Math.max(0, this.foodLevel - amount);
        console.log(`🍽️  Dispensing ${amount} units of food. Food level now: ${this.foodLevel}%`);
        if (this.thing && this.foodLevel < 20) {
            this.thing.emitEvent("lowFoodLevel", null);
            console.log("⚠️  Low food level alert emitted!");
        }
    }
}

const port = 9105;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
    console.log('Simulated FoodDispensor Device starting...');
    const foodDispensor = new FoodDispensor();
    const thing = await WoT.produce({
        title: "FoodDispensor",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
        security: ["no_sec"],
        properties: {},
        actions: {
            dispenseFood: {
                title: "Dispense Food",
                description: "Dispenses food into the tanks",
                input: { type: "number" }
            }
        },
        events: {
            lowFoodLevel: {
                title: "Low Food Level",
                description: "A notification that the food dispensor is almost empty",
                data: { type: "null" }
            }
        }
    });

    foodDispensor.setThing(thing);
    thing.setActionHandler("dispenseFood", foodDispensor.dispenseFood.bind(foodDispensor));
    await thing.expose();
    console.log(`FoodDispensor exposed at http://localhost:${port}/fooddispensor`);
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
