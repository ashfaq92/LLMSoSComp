// flatWoT.js
// Achieves: When aquarium water health degrades to a critical level, alert the home occupant and reduce non-essential home energy use (e.g., lower heating)

import { Servient } from '@node-wot/core';
import BindingHttpPkg from '@node-wot/binding-http';
const { HttpClientFactory } = BindingHttpPkg;


// TD URLs for the required devices (update if needed)
const TANK_SENSORS_TD_URL = 'http://localhost:9112/tanksensors';
const HEATER_TD_URL = 'http://localhost:8104/heater';
const MOTION_SENSOR_TD_URL = 'http://localhost:8107/motionsensor';
const SMART_ASSISTANT_TD_URL = 'http://localhost:8108/smartassistant';
const LEDS_TD_URL = 'http://localhost:8105/leds';
const TANK_LIGHTING_TD_URL = 'http://localhost:9111/tanklighting';
const SCHEDULER_TD_URL = 'http://localhost:9108/scheduler';

// Thresholds for critical water health (example: pH < 6.5 or nitrate > 40)
const CRITICAL_PH = 6.5;
const CRITICAL_NITRATE = 40;

async function main() {
	const servient = new Servient();
	servient.addClientFactory(new HttpClientFactory());
	const WoT = await servient.start();
	const startedAt = Date.now();

	// Consume Thing Descriptions
	const tankSensors = await WoT.consume(await (await fetch(TANK_SENSORS_TD_URL)).json());
	const heater = await WoT.consume(await (await fetch(HEATER_TD_URL)).json());
	const motionSensor = await WoT.consume(await (await fetch(MOTION_SENSOR_TD_URL)).json());
	const smartAssistant = await WoT.consume(await (await fetch(SMART_ASSISTANT_TD_URL)).json());
	const leds = await WoT.consume(await (await fetch(LEDS_TD_URL)).json());
	const tankLighting = await WoT.consume(await (await fetch(TANK_LIGHTING_TD_URL)).json());
	const scheduler = await WoT.consume(await (await fetch(SCHEDULER_TD_URL)).json());


	// Subscribe to pH and nitrate events
	tankSensors.subscribeEvent('pHLevel', async (eventData) => {
		let payload = eventData;
		if (eventData && typeof eventData.value === 'function') {
			payload = await eventData.value();
		}
		if (payload?.pHLevel !== undefined && payload.pHLevel < CRITICAL_PH) {
			await handleCriticalWaterHealth(`Critical pH level detected: ${payload.pHLevel}`);
		}
	});
	tankSensors.subscribeEvent('nitrateLevel', async (eventData) => {
		let payload = eventData;
		if (eventData && typeof eventData.value === 'function') {
			payload = await eventData.value();
		}
		if (payload?.nitrateLevel !== undefined && payload.nitrateLevel > CRITICAL_NITRATE) {
			await handleCriticalWaterHealth(`Critical nitrate level detected: ${payload.nitrateLevel}`);
		}
	});

	// Occupancy state tracking
	let lastMotionTime = Date.now();
	let occupancy = 'away';
	const AWAY_TIMEOUT = 10000 * 3; // 30 seconds for demo; adjust as needed

	// Listen for motion events
	motionSensor.subscribeEvent('motionDetected', () => {
		lastMotionTime = Date.now();
		if (occupancy === 'away') {
			occupancy = 'home';
			console.log('🏠 Occupancy switched to HOME');
		}
	});

	// Periodically check for "away" state
	setInterval(async () => {
		if (occupancy === 'home' && Date.now() - lastMotionTime > AWAY_TIMEOUT) {
			occupancy = 'away';
			console.log('🚪 Occupancy switched to AWAY');
			await handleOccupancyAway();
		}
	}, 5000);

	// Heartbeat to show orchestrator is alive even when no events arrive.
	setInterval(() => {
		const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
		console.log(`Heartbeat: orchestrator alive | occupancy=${occupancy} | uptime=${uptimeSeconds}s`);
	}, 10000);

	async function handleOccupancyAway() {
		// 1. Set aquarium lighting to energy-saving mode
		try {
			await tankLighting.invokeAction('alterLightingProfile', 'energy-saving');
			console.log('Aquarium lighting set to energy-saving mode.');
		} catch (err) {
			console.warn('Failed to set aquarium lighting:', err.message);
		}
		// 2. Pause scheduled feeding (by scheduling a pause task)
		try {
			await scheduler.invokeAction('scheduleTask', { role: 'aquarium', task: 'pause_feeding' });
			console.log('Scheduled feeding paused.');
		} catch (err) {
			console.warn('Failed to pause scheduled feeding:', err.message);
		}
	}

	async function handleCriticalWaterHealth(reason) {
		console.log('⚠️  Critical water health detected:', reason);
		// 1. Alert the home occupant
		try {
			await smartAssistant.invokeAction('say', { phrase: reason });
			await leds.invokeAction('blink');
		} catch (err) {
			console.warn('Failed to trigger home alert devices:', err.message);
		}
		// 2. Reduce non-essential home energy use (lower heating)
		// Example: set heater to lower temperature for 10 minutes
		try {
			await heater.invokeAction('startHeater', { temperature: 16, timeHeating: 10 });
			console.log('Heater set to energy-saving mode.');
		} catch (err) {
			console.warn('Failed to set heater:', err.message);
		}
	}

	console.log('flatWoT orchestrator running: monitoring aquarium water health and home occupancy...');
}

main().catch(console.error);
