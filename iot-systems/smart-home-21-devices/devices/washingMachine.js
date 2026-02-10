import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 8082 }));
servient.start().then(async (WoT) => {
	console.log('Simulated Washing Machine Device starting...');
	const thing = await WoT.produce({
		title: "WashingMachine",
		description: "A simulated washing machine device",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        "@type": ["Thing"],
		securityDefinitions: {
			no_sec: { scheme: "nosec" }
		},
		security: ["no_sec"],
		properties: {},
		actions: {},
		events: {
			finishedCycle: {
				title: "Wash cycle complete",
				description: "Sends a notification at the end of a wash cycle",
				data: { type: "object" }
			}
		}
	});
	await thing.expose();
	console.log('WashingMachine exposed at http://localhost:8082/washingmachine');
	// Simulate a wash cycle with random interval between 5-15 seconds
	const scheduleWashCycle = () => {
		const randomDelay = Math.random() * 10000 + 5000; // 5000-15000ms
		setTimeout(() => {
			const eventData = {
				message: "Wash cycle finished!",
				timestamp: new Date().toISOString()
			};
			thing.emitEvent("finishedCycle", eventData);
			console.log("🧺 Wash cycle finished. Event 'finishedCycle' emitted with data:", eventData);
			scheduleWashCycle(); // Schedule next cycle
		}, randomDelay);
	};
	scheduleWashCycle();
});
