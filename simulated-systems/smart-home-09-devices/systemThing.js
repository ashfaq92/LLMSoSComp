import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const HttpClientFactory = httpBinding.HttpClientFactory || httpBinding.default?.HttpClientFactory;

async function getTDsFromTDD(tddUrl = 'http://localhost:8101/things') {
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
                description: "Current occupancy status of the home",
                value: "home"
            },
            currentHeatingTemp: {
                type: "number",
                description: "Current temperature set for the heating system",
                value: 20
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
            doorbellPressed: {
                description: "Emitted when the doorbell is pressed"
            },
            motionDetected: {
                description: "Emitted when motion is detected in a room",
                data: {
                    type: "object",
                    properties: {
                        room: { type: "string" }
                    }
                }
            },
            morningAlarmTriggered: {
                description: "Emitted when the morning alarm is triggered"
            }
        }
    });


    let occupancyStatus = "home"; 
    systemThing.setPropertyReadHandler('occupancyStatus', async () => occupancyStatus);
    systemThing.setPropertyWriteHandler('occupancyStatus', async (value) => {
        occupancyStatus = value;
    });

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

    // Doorbell pressed event
    if (devices.doorbell) {
        devices.doorbell.subscribeEvent('bellRung', async () => {
            await systemThing.emitEvent('doorbellPressed');
        });
    }

    // Motion detected event (example for main room, extend for other rooms as needed)
    if (devices.motionsensor) {
        devices.motionsensor.subscribeEvent('motionDetected', async () => {
            await systemThing.emitEvent('motionDetected', { room: "main" });
            console.log("Motion detected in main room, emitted motionDetected event");
        });
    }

    // Morning alarm triggered event
    if (devices.alarm) {
        devices.alarm.subscribeEvent('alarmRinging', async () => {
            await systemThing.emitEvent('morningAlarmTriggered');
        });
    }

    await systemThing.expose();
    console.log(`SmartHomeThing exposed at http://localhost:${port}/smarthomething`);

}

main().catch((err) => {
    console.error('SmartHomeSystem: Fatal error:', err);
    process.exit(1);
});

