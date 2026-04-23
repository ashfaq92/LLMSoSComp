import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

async function getTDsFromTDD(tddUrl = 'http://localhost:8081/things') {
    const { things } = await fetch(tddUrl).then(r => r.json());
    return things; // array of full TDs
}

async function main() {
    const servient = new Servient();
    const port = 8100;
    servient.addServer(new HttpServer({ port: port }));
    servient.addClientFactory(new HttpClientFactory());
    const WoT = await servient.start();

    // Fetch all TDs from TDD and consume them
    const devices = {};
    for (const td of await getTDsFromTDD()) {
        devices[td.title.toLowerCase()] = await WoT.consume(td);
        console.log(`Consumed: ${td.title}`);
    }


    // System Thing Description
    const systemThing = await WoT.produce({
        title: 'SmartHomeThing',
        description: 'System-level WoT Thing for smart home',
        '@context': ['https://www.w3.org/2022/wot/td/v1.1'],
        '@type': ['Thing'],
        securityDefinitions: { no_sec: { scheme: 'nosec' } },
        security: ['no_sec'],
        properties: {
            occupancyStatus: {
                type: "string",
                enum: ["home", "away"],
                description: "Current occupancy status of the home"
            },
            currentHeatingTemp: {
                type: "number",
                description: "Current temperature set for the heating system"
            }
        },
        actions: {
            notifyWashingComplete: {
                description: "Blinks LEDs to signal washing machine cycle end"
            },
            handleMotionEntry: {
                description: "Turns on room light when motion detected",
                input: { type: "object", properties: { room: { type: "string" } } }
            },
            handleDoorbell: {
                description: "Mutes speaker, announces doorbell via assistant, restores volume"
            },
            triggerMorningRoutine: {
                description: "Activates heating to 30C for 20 mins on morning alarm"
            },
            triggerAlert: {
                description: "General occupant alert via assistant + LEDs",
                input: { type: "object", properties: { message: { type: "string" }, severity: { type: "string" } } }
            },
            setHeating: {
                description: "Sets heating to given temperature for given duration",
                input: { type: "object", properties: { temperature: { type: "number" }, duration_mins: { type: "number" } } }
            }
        },
        events: {
            washingCycleCompleted: {
                description: "Emitted when washing machine finishes and LEDs have been notified",
                data: { type: "object" }
            },
            motionEntryHandled: {
                description: "Emitted when motion is detected and main room light is turned on",
                data: { type: "object" }
            },
            doorbellHandled: {
                description: "Emitted when the doorbell is pressed and the workflow (speaker mute, assistant alert, restore volume) is completed",
                data: { type: "object" }
            },
            morningRoutineHandled: {
                description: "Emitted when the morning alarm triggers and heating is set to 30°C for 20 minutes",
                data: { type: "object" }
            },
        }
    });


    // After producing systemThing
    await systemThing.writeProperty("occupancyStatus", "home");
    await systemThing.writeProperty("currentHeatingTemp", 20); // or your default temp

    if (devices.washingmachine && devices.leds) {

        devices.washingmachine.subscribeEvent('finishedCycle', async () => {
            await devices.leds.invokeAction('blink');
            const eventData = {
                message: "finishedCycle event from smart home systemThing!",
                timestamp: new Date().toISOString()
            };
            await systemThing.emitEvent('washingCycleCompleted', eventData);
            console.log("🧺🚥 washingCycleCompleted emitted", eventData);

        });
    }

    if (devices.motionsensor && devices.mainroomlight) {
        devices.motionsensor.subscribeEvent('motionDetected', async () => {
            await devices.mainroomlight.invokeAction('lightOn');
            const eventData = {
                message: "Motion detected and main room light turned on!",
                timestamp: new Date().toISOString()
            };
            await systemThing.emitEvent('motionEntryHandled', eventData);
            console.log("🚶💡 motionEntryHandled emitted", eventData);
        });
    }


    if (devices.doorbell && devices.speaker && devices.smartassistant) {
        devices.doorbell.subscribeEvent('bellRung', async () => {
            try {
                const originalVolume = await (await devices.speaker.invokeAction('getVolume')).value();

                // Setting volume to 10%
                await devices.speaker.invokeAction('setVolume', { percentage: 10 });
                // Smart assistant alert...
                await devices.smartassistant.invokeAction('say', { phrase: "Someone is at the door!" });
                // Restoring original volume...
                await devices.speaker.invokeAction('setVolume', { percentage: originalVolume });
                const eventData = {
                    message: "Doorbell pressed, homeowner alerted, speaker volume restored.",
                    timestamp: new Date().toISOString()
                };
                await systemThing.emitEvent('doorbellHandled', eventData);
                console.log("🔔🤖 doorbellHandled emitted", eventData);
            } catch (err) {
                console.error('Failed to handle doorbell workflow:', err);
            }
        });
    }


    if (devices.alarm && devices.heater) {
        devices.alarm.subscribeEvent('alarmRinging', async () => {
            try {
                // Start heater at 30°C for 20 minutes
                await devices.heater.invokeAction('startHeater', { temperature: 30, timeHeating: 20 });
                const eventData = {
                    message: "Morning alarm triggered, heater set to 30°C for 20 minutes.",
                    timestamp: new Date().toISOString()
                };
                await systemThing.emitEvent('morningRoutineHandled', eventData);
                console.log("⏰🔥 morningRoutineHandled emitted", eventData);
            } catch (err) {
                console.error('Failed to handle morning routine workflow:', err);
            }
        });
    }

    // Action: notifyWashingComplete
    systemThing.setActionHandler("notifyWashingComplete", async () => {
        if (devices.leds) {
            await devices.leds.invokeAction('blink');
        }
    });

    // Action: handleMotionEntry
    systemThing.setActionHandler("handleMotionEntry", async (params) => {
        const room = params?.room?.toLowerCase();
        if (room && devices[`${room}light`]) {
            await devices[`${room}light`].invokeAction('lightOn');
        } else if (devices.mainroomlight) {
            await devices.mainroomlight.invokeAction('lightOn');
        }
    });

    // Action: handleDoorbell
    systemThing.setActionHandler("handleDoorbell", async () => {
        if (devices.speaker && devices.smartassistant) {
            const originalVolume = await (await devices.speaker.invokeAction('getVolume')).value();
            await devices.speaker.invokeAction('setVolume', { percentage: 10 });
            await devices.smartassistant.invokeAction('say', { phrase: "Someone is at the door!" });
            await devices.speaker.invokeAction('setVolume', { percentage: originalVolume });
        }
    });

    // Action: triggerMorningRoutine
    systemThing.setActionHandler("triggerMorningRoutine", async () => {
        if (devices.heater) {
            await devices.heater.invokeAction('startHeater', { temperature: 30, timeHeating: 20 });
            await systemThing.writeProperty("currentHeatingTemp", 30);
        }
    });

    // Action: triggerAlert
    systemThing.setActionHandler("triggerAlert", async (params) => {
        const message = params?.message || "Alert!";
        if (devices.smartassistant) {
            await devices.smartassistant.invokeAction('say', { phrase: message });
        }
        if (devices.leds) {
            await devices.leds.invokeAction('blink');
        }
    });

    // Action: setHeating
    systemThing.setActionHandler("setHeating", async (params) => {
        const temperature = params?.temperature;
        const duration = params?.duration_mins;
        if (devices.heater && typeof temperature === "number" && typeof duration === "number") {
            await devices.heater.invokeAction('startHeater', { temperature, timeHeating: duration });
            await systemThing.writeProperty("currentHeatingTemp", temperature);
        }
    });

    await systemThing.expose();
    console.log(`SmartHomeThing exposed at http://localhost:${port}/smarthomething`);
}

main().catch((err) => {
    console.error('SmartHomeSystem: Fatal error:', err);
    process.exit(1);
});

