// FEELS LIKE HOSTING (CONFIGURING/BOOTSTRAPPING) A THING

Servient = require('@node-wot/core').Servient
HttpServer = require('@node-wot/binding-http').HttpServer
Helpers = require('@node-wot/core').Helpers


const httpServer = new HttpServer({ port: 8080 })

const servient = new Servient()
Helpers.setStaticAddress('localhost')
servient.addServer(httpServer)


servient.start().then(async (WoT) => {
    console.log('WoT Servient started')
    let curTemp = 22
    const thing = await WoT.produce({
        title: 'MyTemperatureController',
        properties: {
            temperature: {
                type: 'number',
                description: 'Current temperature in Celsius'
            }
        },
        actions: {
            increaseTemperature: {
                description: 'Increase temperature by 1 degree',
                input: {
                    type: 'number',
                    unit: 'seconds'
                }
            },
            decreaseTemperature: {
                description: 'Decrease temperature by 1 degree',
                input: {
                    type: 'number',
                    unit: 'seconds'
                }
            }
        },
        events: {
            overHeat: {
                description: 'Event emitted when temperature exceeds threshold',
                data: {
                    type: 'number'
                }
            }
        }
    })

    thing.setPropertyReadHandler('temperature', async () => {
        return curTemp
    })

    thing.setActionHandler('increaseTemperature', async (input) => {
        const parsedInput = await input.value()
        console.log(`Increasing temperature for ${parsedInput} seconds...`)
        setTimeout(() => {
            curTemp = curTemp + parsedInput / 10
            if (curTemp > 30) {
                console.log(`Emitting overHeat event with temperature: ${curTemp}`)
                thing.emitEvent('overHeat', curTemp)
            }
        }, parsedInput)
        return { status: 'ok', message: 'Temperature increase scheduled' }
    })



    await thing.expose()
})   