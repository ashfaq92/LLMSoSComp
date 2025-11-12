import json

with open('../smart_home/devices.json', 'r') as file:
    smart_home_devices = json.load(file)



example_user_prompt = """
When a quality, temperature, or vibration alert is made, send this data for analysis. Once data analysis is complete log the result as well as analysing it for indications that maintenance is needed. If maintenance is needed, alert the manager of this. Additionally, send the result of data analysis to be analysed for efficiency and alert the manager of this too.

Send quality alerts directly to the manager.

When resources are used, alert the manager of the usage, and log it in the database.


"""

example_workflow = """
[
    {
        "id": "ec66bca55939c9e9",
        "type": "tab",
        "label": "Flow 1",
        "disabled": false,
        "info": "",
        "env": []
    },
    {
        "id": "91955d31fa745dd4",
        "type": "system-event-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingEvent": "newQualityData",
        "thingEventValue": "{\"uri\":\"http://localhost:8080/qualityinspector\",\"output\":{\"type\":\"string\",\"description\":\"Details about the quality of products\"},\"description\":\"Alerts when new quality data is ready for processing\",\"title\":\"New quality data\",\"event\":\"newQualityData\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 120,
        "y": 200,
        "wires": [
            [
                "5bf3eea765f7ca7a",
                "3bb0c2950a4e47f9"
            ]
        ]
    },
    {
        "id": "158964f562184c97",
        "type": "system-event-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingEvent": "temperatureAlert",
        "thingEventValue": "{\"uri\":\"http://localhost:8080/temperaturetracker\",\"output\":{\"type\":\"number\",\"description\":\"The current temperature of machines\"},\"description\":\"Produces an alert with the current temperature of machines\",\"title\":\"Temperature alert\",\"event\":\"temperatureAlert\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 120,
        "y": 280,
        "wires": [
            [
                "7da9cf95e81e8a24"
            ]
        ]
    },
    {
        "id": "0b35425b3a2bbd71",
        "type": "system-event-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingEvent": "vibrationAlert",
        "thingEventValue": "{\"uri\":\"http://localhost:8080/vibrationmonitor\",\"output\":{\"type\":\"number\",\"description\":\"The amplitude of the current vibration of the machines\"},\"description\":\"Created a notification of the current vibration of machines\",\"title\":\"Vibration alert\",\"event\":\"vibrationAlert\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 110,
        "y": 360,
        "wires": [
            [
                "13d27a83ec253b04"
            ]
        ]
    },
    {
        "id": "d4c89f71c650dd32",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "processSensorData",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/sensorhub\",\"params\":{\"sensorName\":\"string\",\"data\":\"string\"},\"description\":\"Adds the provided sensor data for processing\",\"title\":\"Process sensor data\",\"action\":\"processSensorData\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 390,
        "y": 320,
        "wires": [
            []
        ]
    },
    {
        "id": "4d34410bcd990e0f",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "reviewForMaintenance",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/maintenancemonitor\",\"params\":{},\"output\":{\"type\":\"boolean\",\"description\":\"Whether or not the system needs maintenance\"},\"description\":\"Reviews a system's status for issues that may need maintenance\",\"title\":\"Review for maintenance\",\"action\":\"reviewForMaintenance\"}",
        "outputToMsg": true,
        "redeploy": "false",
        "x": 460,
        "y": 520,
        "wires": [
            [
                "90186fae4671c26b"
            ]
        ]
    },
    {
        "id": "dd07b6d2c9d8508c",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "logData",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/database\",\"params\":{},\"description\":\"Logs the input data\",\"title\":\"Log data\",\"action\":\"logData\"}",
        "outputToMsg": true,
        "redeploy": "false",
        "x": 420,
        "y": 460,
        "wires": [
            []
        ]
    },
    {
        "id": "235d1415f23c0e83",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "alertManager",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/managersdevice\",\"params\":{\"alertType\":\"string\",\"alertContent\":\"string\"},\"description\":\"Makes an alert on the manager's device\",\"title\":\"Alert the manager\",\"action\":\"alertManager\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 950,
        "y": 520,
        "wires": [
            []
        ]
    },
    {
        "id": "90186fae4671c26b",
        "type": "switch",
        "z": "ec66bca55939c9e9",
        "name": "",
        "property": "payload",
        "propertyType": "msg",
        "rules": [
            {
                "t": "true"
            }
        ],
        "checkall": "true",
        "repair": false,
        "outputs": 1,
        "x": 630,
        "y": 520,
        "wires": [
            [
                "f4bddae4bb753ad7"
            ]
        ]
    },
    {
        "id": "f4bddae4bb753ad7",
        "type": "change",
        "z": "ec66bca55939c9e9",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "[\"maintanence needed\", \"\"]",
                "tot": "json"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 780,
        "y": 520,
        "wires": [
            [
                "235d1415f23c0e83"
            ]
        ]
    },
    {
        "id": "5bf3eea765f7ca7a",
        "type": "change",
        "z": "ec66bca55939c9e9",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "[\"quality\", msg.payload]",
                "tot": "jsonata"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 160,
        "y": 240,
        "wires": [
            [
                "d4c89f71c650dd32"
            ]
        ]
    },
    {
        "id": "7da9cf95e81e8a24",
        "type": "change",
        "z": "ec66bca55939c9e9",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "[\"temperature\", msg.payload]",
                "tot": "jsonata"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 160,
        "y": 320,
        "wires": [
            [
                "d4c89f71c650dd32"
            ]
        ]
    },
    {
        "id": "13d27a83ec253b04",
        "type": "change",
        "z": "ec66bca55939c9e9",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "[\"vibration\", msg.payload]",
                "tot": "jsonata"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 160,
        "y": 400,
        "wires": [
            [
                "d4c89f71c650dd32"
            ]
        ]
    },
    {
        "id": "ec6f58bccc8e19e3",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "calculateEfficiency",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/efficiencyanalyser\",\"params\":{},\"output\":{\"type\":\"integer\",\"description\":\"The calculated percentage efficiency of the system\"},\"description\":\"Calculates the efficiency of the system\",\"title\":\"Calculate efficiency\",\"action\":\"calculateEfficiency\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 450,
        "y": 580,
        "wires": [
            [
                "12d9cfb76c387f6e"
            ]
        ]
    },
    {
        "id": "2de19fffe753196c",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "alertManager",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/managersdevice\",\"params\":{\"alertType\":\"string\",\"alertContent\":\"string\"},\"description\":\"Makes an alert on the manager's device\",\"title\":\"Alert the manager\",\"action\":\"alertManager\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 810,
        "y": 580,
        "wires": [
            []
        ]
    },
    {
        "id": "12d9cfb76c387f6e",
        "type": "change",
        "z": "ec66bca55939c9e9",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "[\"efficiency\", msg.payload]",
                "tot": "jsonata"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 640,
        "y": 580,
        "wires": [
            [
                "2de19fffe753196c"
            ]
        ]
    },
    {
        "id": "fde4b9d9924374de",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "alertManager",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/managersdevice\",\"params\":{\"alertType\":\"string\",\"alertContent\":\"string\"},\"description\":\"Makes an alert on the manager's device\",\"title\":\"Alert the manager\",\"action\":\"alertManager\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 550,
        "y": 160,
        "wires": [
            []
        ]
    },
    {
        "id": "3bb0c2950a4e47f9",
        "type": "change",
        "z": "ec66bca55939c9e9",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "[\"efficiency\", msg.payload]",
                "tot": "jsonata"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 380,
        "y": 160,
        "wires": [
            [
                "fde4b9d9924374de"
            ]
        ]
    },
    {
        "id": "452b85f545704436",
        "type": "system-event-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingEvent": "resourceUsed",
        "thingEventValue": "{\"uri\":\"http://localhost:8080/inventorymanager\",\"output\":{\"type\":\"object\",\"properties\":{\"resourceName\":{\"type\":\"string\",\"description\":\"The name of the resource used\"},\"quantity\":{\"type\":\"number\",\"description\":\"The amount of the resource used\"}}},\"description\":\"Makes an alert when a resource is used\",\"title\":\"Resource used\",\"event\":\"resourceUsed\"}",
        "outputToMsg": true,
        "redeploy": "false",
        "x": 110,
        "y": 660,
        "wires": [
            [
                "52a17da8edaf3685",
                "cd8b7c2c05693627"
            ]
        ]
    },
    {
        "id": "cd8b7c2c05693627",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "logData",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/database\",\"params\":{},\"description\":\"Logs the input data\",\"title\":\"Log data\",\"action\":\"logData\"}",
        "outputToMsg": true,
        "redeploy": "false",
        "x": 300,
        "y": 720,
        "wires": [
            []
        ]
    },
    {
        "id": "d22fe9aed7bd0d6f",
        "type": "system-action-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingAction": "alertManager",
        "thingActionValue": "{\"uri\":\"http://localhost:8080/managersdevice\",\"params\":{\"alertType\":\"string\",\"alertContent\":\"string\"},\"description\":\"Makes an alert on the manager's device\",\"title\":\"Alert the manager\",\"action\":\"alertManager\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 490,
        "y": 660,
        "wires": [
            []
        ]
    },
    {
        "id": "52a17da8edaf3685",
        "type": "change",
        "z": "ec66bca55939c9e9",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "[\"resourceUsed\", msg.payload]",
                "tot": "jsonata"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 320,
        "y": 660,
        "wires": [
            [
                "d22fe9aed7bd0d6f"
            ]
        ]
    },
    {
        "id": "544dac9b227bb08f",
        "type": "system-event-node",
        "z": "ec66bca55939c9e9",
        "name": "",
        "thingDirectoryURI": "http://localhost:8080/thingdirectory",
        "thingEvent": "dataProcessingComplete",
        "thingEventValue": "{\"uri\":\"http://localhost:8080/sensorhub\",\"output\":{\"type\":\"string\",\"description\":\"Status information about the current state of the system\"},\"description\":\"Makes a notification when sensor data processing is complete\",\"title\":\"Data processing complete\",\"event\":\"dataProcessingComplete\"}",
        "outputToMsg": true,
        "redeploy": "true",
        "x": 150,
        "y": 520,
        "wires": [
            [
                "dd07b6d2c9d8508c",
                "4d34410bcd990e0f",
                "ec6f58bccc8e19e3"
            ]
        ]
    }
]
"""


smart_home_devices = """[{"@context":"http://www.w3.org/ns/td","@type":["Thing"],"title":"WashingMachine","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{"status":{"title":"Machine Status","description":"Current state of the washing machine","type":"string","enum":["idle","running","finished"],"readOnly":true,"forms":[{"href":"http://localhost:8080/things/wm/status","contentType":"application/json","op":["readproperty"]}]},"remainingTime":{"title":"Time Left","description":"Remaining wash cycle time in minutes","type":"integer","unit":"minutes","readOnly":true,"forms":[{"href":"http://localhost:8080/things/wm/remainingTime","contentType":"application/json","op":["readproperty"]}]}},"actions":{"start":{"title":"Start Washing Cycle","description":"Start a new wash program","input":{"type":"string","enum":["quick","cotton","wool"]},"forms":[{"href":"http://localhost:8080/things/wm/start","contentType":"application/json","op":["invokeaction"]}]},"stop":{"title":"Stop Cycle","description":"Immediately stop the wash program","forms":[{"href":"http://localhost:8080/things/wm/stop","contentType":"application/json","op":["invokeaction"]}]}},"events":{"finishedCycle":{"title":"Wash cycle complete","description":"Sends a notification at the end of a wash cycle","data":{"type":"string"},"forms":[{"href":"ws://localhost:8080/things/wm/finishedCycle","subprotocol":"websocket","contentType":"application/json","op":["subscribeevent"]},{"href":"http://localhost:8080/things/wm/finishedCycle","subprotocol":"longpoll"}]}}},{"@context":["http://www.w3.org/ns/td"],"@type":["Thing"],"title":"DoorBell","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{"enabled":{"title":"Enabled","description":"Whether the doorbell is active","type":"boolean","readOnly":false,"forms":[{"href":"http://localhost:8080/doorbell/enabled","contentType":"application/json","op":["readproperty","writeproperty"]}]},"lastRung":{"title":"Last Rung","description":"Timestamp of the last ring","type":"string","readOnly":true,"forms":[{"href":"http://localhost:8080/doorbell/lastRung","contentType":"application/json","op":["readproperty"]}]}},"actions":{"toggle":{"title":"Enable/Disable Doorbell","description":"Invert the current enabled state","forms":[{"href":"http://localhost:8080/doorbell/toggle","contentType":"application/json","op":["invokeaction"]}]},"ring":{"title":"Ring Doorbell","description":"Manually trigger the bell","forms":[{"href":"http://localhost:8080/doorbell/ring","contentType":"application/json","op":["invokeaction"]}]}},"events":{"bellRung":{"title":"Bell rung","description":"The bell was rung","data":{"type":"string"},"forms":[{"href":"http://localhost:8080/doorbell/bellRung","subprotocol":"longpoll"}]}}},{"@context":["[http://www.w3.org/ns/td](http://www.w3.org/ns/td)"],"@type":["Thing"],"title":"MainRoomLight","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{"status":{"title":"Light status","description":"Current state of the main room light","type":"string","enum":["on","off"],"readOnly":true,"forms":[{"href":"http://localhost:8080/things/mainroomlight/status","contentType":"application/json","op":["readproperty"]}]}},"actions":{"lightOn":{"title":"Turn light on","description":"Turns the light on","forms":[{"href":"http://localhost:8080/things/mainroomlight/on","contentType":"application/json","op":["invokeaction"]}]},"lightOff":{"title":"Turn light off","description":"Turns the light off","forms":[{"href":"http://localhost:8080/things/mainroomlight/off","contentType":"application/json","op":["invokeaction"]}]}},"events":{"lightStateChanged":{"title":"Light state changed","description":"Emitted whenever the main room light changes state","data":{"type":"string"},"forms":[{"href":"ws://localhost:8080/things/mainroomlight/lightStateChanged","subprotocol":"websocket","contentType":"application/json","op":["subscribeevent"]}]}}},{"@context":["http://www.w3.org/ns/td"],"@type":["Thing"],"title":"Speaker","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{"volume":{"title":"Volume","description":"The current volume percentage","type":"integer","forms":[{"href":"http://localhost:8080/things/speaker/volume","contentType":"application/json","op":["readproperty"]}]}},"actions":{"setVolume":{"title":"Set volume","description":"Sets the volume of this speaker","input":{"type":"object","properties":{"percentage":{"type":"integer","minimum":0,"maximum":100,"description":"The volume percentage (0–100)"}},"required":["percentage"]},"forms":[{"href":"http://localhost:8080/things/speaker/setVolume","contentType":"application/json","op":["invokeaction"]}]},"getVolume":{"title":"Get volume","description":"Gets the current volume of this speaker","output":{"type":"integer"},"forms":[{"href":"http://localhost:8080/things/speaker/getVolume","contentType":"application/json","op":["invokeaction"]}]}},"events":{}},{"@context":["[http://www.w3.org/ns/td](http://www.w3.org/ns/td)"],"@type":["Thing"],"title":"Alarm","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{"time":{"title":"Alarm Time","description":"The scheduled alarm time in HH:MM format","type":"string","readOnly":false,"forms":[{"href":"http://localhost:8080/alarm/time","contentType":"application/json","op":["readproperty","writeproperty"]}]},"enabled":{"title":"Enabled","description":"Whether the alarm is active","type":"boolean","readOnly":false,"forms":[{"href":"http://localhost:8080/alarm/enabled","contentType":"application/json","op":["readproperty","writeproperty"]}]}},"actions":{"setTime":{"title":"Set Alarm Time","input":{"type":"string","pattern":"^([01]?[0-9]|2[0-3]):[0-5][0-9]$"},"forms":[{"href":"http://localhost:8080/alarm/setTime","contentType":"application/json","op":["invokeaction"]}]},"toggle":{"title":"Enable/Disable Alarm","input":{"type":"boolean"},"forms":[{"href":"http://localhost:8080/alarm/toggle","contentType":"application/json","op":["invokeaction"]}]},"stop":{"title":"Stop Alarm","description":"Stops the ringing alarm","forms":[{"href":"http://localhost:8080/alarm/stop","contentType":"application/json","op":["invokeaction"]}]}},"events":{"alarmRinging":{"title":"Alarm Ringing","description":"This alarm has started ringing","data":{"type":"string"},"forms":[{"href":"http://localhost:8080/alarm/ringing","subprotocol":"longpoll"}]}}},{"@context":["[http://www.w3.org/ns/td](http://www.w3.org/ns/td)"],"@type":["Thing"],"title":"Heater","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{"temperature":{"title":"Current temperature","description":"Shows the target temperature of the heater (°C)","type":"integer","readOnly":true,"forms":[{"href":"http://localhost:8080/things/heater/status","contentType":"application/json","op":["readproperty"]}]},"timeHeating":{"title":"Time heating","description":"Remaining heating time in minutes","type":"integer","readOnly":true,"forms":[{"href":"http://localhost:8080/things/heater/status","contentType":"application/json","op":["readproperty"]}]},"status":{"title":"Status","description":"Current heater status","type":"string","enum":["on","off"],"readOnly":true,"forms":[{"href":"http://localhost:8080/things/heater/status","contentType":"application/json","op":["readproperty"]}]}},"actions":{"startHeater":{"title":"Start heater","description":"Starts the heater at the given temperature for the given time","input":{"type":"object","properties":{"temperature":{"type":"integer","description":"The temperature in degrees C"},"timeHeating":{"type":"integer","description":"Minutes to keep heater on"}},"required":["temperature","timeHeating"]},"forms":[{"href":"http://localhost:8080/things/heater/startHeater","contentType":"application/json","op":["invokeaction"]}]},"stopHeater":{"title":"Stop heater","description":"Stops the heater immediately","forms":[{"href":"http://localhost:8080/things/heater/stopHeater","contentType":"application/json","op":["invokeaction"]}]}},"events":{"heaterStopped":{"title":"Heater stopped","description":"Raised when the heater stops (timeout or manual stop)","data":{"type":"string"},"forms":[{"href":"ws://localhost:8080/things/heater/heaterStopped","subprotocol":"websocket","contentType":"application/json","op":["subscribeevent"]}]}}},{"@context":["[http://www.w3.org/ns/td](http://www.w3.org/ns/td)"],"@type":["Thing"],"title":"LEDs","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{"status":{"title":"LED Status","description":"Current state of the LEDs","type":"string","enum":["on","off","blinking"],"readOnly":true,"forms":[{"href":"http://localhost:8080/things/leds/status","contentType":"application/json","op":["readproperty"]}]}},"actions":{"blink":{"title":"Blink LEDs","description":"Blinks the LEDs","forms":[{"href":"http://localhost:8080/things/leds/blink","contentType":"application/json","op":["invokeaction"]}]},"LEDsOn":{"title":"Turn LEDs on","description":"Turns on the LEDs","forms":[{"href":"http://localhost:8080/things/leds/on","contentType":"application/json","op":["invokeaction"]}]},"LEDsOff":{"title":"Turn LEDs off","description":"Turns off the LEDs","forms":[{"href":"http://localhost:8080/things/leds/off","contentType":"application/json","op":["invokeaction"]}]}},"events":{"ledStateChanged":{"title":"LED state changed","description":"Emitted when the LED status changes","data":{"type":"string"},"forms":[{"href":"ws://localhost:8080/things/leds/ledStateChanged","subprotocol":"websocket","contentType":"application/json","op":["subscribeevent"]}]}}},{"@context":["[http://www.w3.org/ns/td](http://www.w3.org/ns/td)"],"@type":["Thing"],"title":"MotionSensor","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","properties":{},"actions":{},"events":{"motionDetected":{"title":"Motion detected","description":"An event emitted when motion is detected","data":{"type":"string","description":"Timestamp when motion was detected"},"forms":[{"href":"ws://localhost:8080/things/motionsensor/motiondetected","subprotocol":"wot","contentType":"application/json","op":["subscribeevent","unsubscribeevent"]}]}}},{"@context":["http://www.w3.org/ns/td"],"@type":["Thing"],"title":"SmartAssistant","securityDefinitions":{"no_sec":{"scheme":"nosec"}},"security":"no_sec","actions":{"say":{"title":"Say phrase","description":"Makes the assistant say the given phrase","input":{"type":"object","properties":{"phrase":{"type":"string","description":"The phrase to be spoken by this assistant"}},"required":["phrase"]},"forms":[{"href":"http://localhost:8080/things/smartassistant/say","contentType":"application/json","op":["invokeaction"]}]}},"properties":{},"events":{}}]
"""

SMART_HOME_SYSTEM_PROMPT = "You are an expert IoT system developer, proficient with Web of Things (WoT) descriptions and Node-RED workflow programming. Ensure that all node IDs are unique. Ensure that quote marks used within strings are handled. Ensure your response is valid JSON. Your job is to take new IoT system proposals/descriptions (from users) along with a list of the devices that are available to use (as WoT Thing descriptions). From this information, you will produce an IoT system workflow, for use within Node-RED, which connects the relevant Things/devices in order to satisfy the requirements of the provided system proposal/description."

SMART_HOME_USER_PROMPT = f"""
System Description: Blink LEDs when washing machine cycle has finished. Turn on the main room light when motion is detected in that room. When the door bell is pressed, reduce the speaker volume, make the smart assistant alert the homeowner of the doorbell, return the speaker’s volume. When morning alarm triggers, turn heating on to 30 degrees C for 20mins.
Devices/Things Available: {smart_home_devices}

System Implementation: (The LLMs response)

To do this, you can learn from following examples:
f{example_user_prompt}
f{example_workflow}
"""

