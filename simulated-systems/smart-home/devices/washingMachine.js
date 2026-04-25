
// devices/washingMachine.js
import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class WashingMachineSimulator {
	constructor() {
		this._timeout = null;
	}
	start(emitFn) {
		const schedule = () => {
			const delay = Math.random() * 10000 + 5000;
			this._timeout = setTimeout(() => {
				emitFn();
				schedule();
			}, delay);
		};
		schedule();
	}
	stop() {
		if (this._timeout) clearTimeout(this._timeout);
	}
}

const port = 8110;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));

servient.start().then(async (WoT) => {
	const sim = new WashingMachineSimulator();
	const thing = await WoT.produce({
		title: "WashingMachine",
		description: "A simulated washing machine device",
		"@context": ["https://www.w3.org/2022/wot/td/v1.1"],
		"@type": ["Thing"],
		securityDefinitions: { no_sec: { scheme: "nosec" } },
		security: ["no_sec"],
		properties: {},
		actions: {
			startCycle: { description: "Start the washing machine simulation" },
			stopCycle:  { description: "Stop the washing machine simulation" }
		},
		events: {
			finishedCycle: {
				title: "Wash cycle complete",
				description: "Sends a notification at the end of a wash cycle",
				data: { type: "object" }
			}
		}
	});
	thing.setActionHandler("startCycle", async () => {
		sim.start(() => {
			const eventData = {
				message: "Wash cycle finished!",
				timestamp: new Date().toISOString()
			};
			thing.emitEvent("finishedCycle", eventData);
			console.log("🧺 finishedCycle emitted", eventData);
		});
	});
	thing.setActionHandler("stopCycle", async () => sim.stop());
	await thing.expose();
	console.log(`WashingMachine exposed at http://localhost:${port}/washingmachine`);
	sim.start(() => {
		const eventData = {
			message: "Wash cycle finished!",
			timestamp: new Date().toISOString()
		};
		thing.emitEvent("finishedCycle", eventData);
		console.log("🧺 finishedCycle emitted");
	});
	const td = await thing.getThingDescription();
	await fetch('http://localhost:8101/things', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(td)
	});
});
