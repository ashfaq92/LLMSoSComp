import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

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

export default FoodDispensor;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
    const servient = new Servient();
    servient.addServer(new HttpServer({ port: 9105 }));

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
        console.log('FoodDispensor exposed at http://localhost:9105/fooddispensor');
    });
}
