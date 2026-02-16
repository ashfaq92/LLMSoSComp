import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9105 }));

servient.start().then(async (WoT) => {
    console.log('Simulated FoodDispensor Device starting...');
    let foodLevel = 100; // Percentage

    const thing = await WoT.produce({
        title: "FoodDispensor",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            dispenseFood: {
                title: "Dispense Food",
                description: "Dispenses food into the tanks",
                input: {
                    type: "number",
                    description: "The amount of food to be dispensed"
                }
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

    thing.setActionHandler("dispenseFood", async (amount) => {
        foodLevel = Math.max(0, foodLevel - amount);
        console.log(`🍽️  Dispensing ${amount} units of food. Food level now: ${foodLevel}%`);
        
        // Check if food level is low
        if (foodLevel < 20) {
            thing.emitEvent("lowFoodLevel", null);
            console.log("⚠️  Low food level alert emitted!");
        }
        return null;
    });

    await thing.expose();
    console.log('FoodDispensor exposed at http://localhost:9105/fooddispensor');
});
