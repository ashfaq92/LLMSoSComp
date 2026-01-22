import { Servient } from '@node-wot/core';
import * as mqttBinding from '@node-wot/binding-mqtt';
const MqttBrokerServer = mqttBinding.MqttBrokerServer || mqttBinding.default?.MqttBrokerServer;
const servient = new Servient();
// An MQTT broker must be running at the specified URI
servient.addServer(new MqttBrokerServer({ uri: "mqtt://test.mosquitto.org" }));
servient.start().then(async (WoT) => {
    console.log('Simulated MQTT Device starting...');
    const thing = await WoT.produce({
        title: "MqttSensor",
        id: "urn:dev:wot:MqttSensor",
        description: "A simulated sensor publishing via MQTT",
        "@context": [
            "https://www.w3.org/2022/wot/td/v1.1"
        ],
        properties: {
            humidity: {
                type: "number",
                readOnly: true,
                observable: true
            }
        }
    });
    let humidity = 50;
    thing.setPropertyReadHandler("humidity", async () => humidity);
    await thing.expose();
    console.log('MqttSensor exposed via MQTT');
    console.log('Thing Description:', JSON.stringify(thing.getThingDescription(), null, 2));
    setInterval(() => {
        humidity = 50 + (Math.random() * 10 - 5);
        thing.emitPropertyChange("humidity");
    }, 3000);
});
