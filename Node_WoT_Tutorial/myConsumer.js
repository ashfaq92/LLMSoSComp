// FEELS LIKE WORKFLOW GENERATOR
Servient = require('@node-wot/core').Servient
HttpClientFactory = require('@node-wot/binding-http').HttpClientFactory
Helpers = require('@node-wot/core').Helpers


const servient = new Servient()

servient.addClientFactory(new HttpClientFactory(null))
let wotHelper = new Helpers(servient)

servient.start().then(async (WoT) => {
    console.log('WoT Servient started - Consumer')
    // could be in the file system or could copy-pasted, but here we fetch it from the url
    wotHelper.fetch('http://127.0.0.1:8080/mytemperaturecontroller/').then(async (td) => {
        const thing = await WoT.consume(td)

        setInterval(async () => {
            const temp = await thing.readProperty('temperature')
            const tempValue = await temp.value()
            console.log(`Current temperature: ${tempValue} °C`)

            if (tempValue < 35) {
                console.log('Temperature is low, increasing...')
                await thing.invokeAction('increaseTemperature', 10)
            }

        }, 1000)

        thing.subscribeEvent('overHeat', async (data) => {
            const overHeatValue = await data.value()
            console.log(`*** ALERT! Overheat event received: ${overHeatValue} °C ***`)
            process.exit(0)
        })
    })
})
