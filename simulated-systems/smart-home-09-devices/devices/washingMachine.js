import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

class WashingMachine {
	constructor() {
		this.thing = null;
		this._interval = null;
	}

	startEmittingCycles(thing) {
		this.thing = thing;
		const emitCycle = () => {
			const randomDelay = Math.random() * 10000 + 5000;
			this._interval = setTimeout(() => {
				const eventData = {
					message: "Wash cycle finished!",
					timestamp: new Date().toISOString()
				};
				thing.emitEvent("finishedCycle", eventData);
				console.log("🧺 Wash cycle finished. Event 'finishedCycle' emitted with data:", eventData);
				emitCycle();
			}, randomDelay);
		};
		emitCycle();
	}

	stopEmittingCycles() {
		if (this._interval) clearTimeout(this._interval);
	}
}

export default WashingMachine;

// Standalone WoT Thing mode for testing/ablation
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
	const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
	const servient = new Servient();
	servient.addServer(new HttpServer({ port: 8082 }));

	servient.start().then(async (WoT) => {
		console.log('Simulated Washing Machine Device starting...');
		const washingMachine = new WashingMachine();
		const thing = await WoT.produce({
			title: "WashingMachine",
			description: "A simulated washing machine device",
			"@context": ["https://www.w3.org/2022/wot/td/v1.1"],
			"@type": ["Thing"],
			securityDefinitions: { no_sec: { scheme: "nosec" } },
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
		washingMachine.startEmittingCycles(thing);
	});
}
