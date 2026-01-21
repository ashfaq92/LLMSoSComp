import coreModule from '@node-wot/core'
import bindingModule from '@node-wot/binding-http'
import getPort from 'get-port'

const { Servient, Helpers } = coreModule
const { HttpServer } = bindingModule

export async function startDevice({ td, handlers = {}, directoryUrl = 'http://localhost:8080/things' }) {
  const port = await getPort()
  const httpServer = new HttpServer({ port })
  const servient = new Servient()
  Helpers.setStaticAddress('localhost')
  servient.addServer(httpServer)

  let thing
  servient.start().then(async (WoT) => {
    thing = await WoT.produce(td)
    // Attach handlers
    for (const [type, map] of Object.entries(handlers)) {
      for (const [name, fn] of Object.entries(map)) {
        thing[type](name, fn)
      }
    }
    await thing.expose()
    console.log(`\n${td.title} running on http://localhost:${port}`)
    // Register with Thing Directory
    setTimeout(async () => {
      try {
        const response = await fetch(directoryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/td+json' },
          body: JSON.stringify(thing.getThingDescription())
        })
        if (response.ok) {
          console.log('✓ Registered with Thing Directory')
        }
      } catch (err) {
        console.log(`⚠️ Could not register: ${err.message}`)
      }
    }, 1000)
  })

  process.on('SIGINT', async () => {
    if (thing) {
      try {
        const response = await fetch(`${directoryUrl}/${thing.getThingDescription().id}`, { method: 'DELETE' })
        if (response.ok) {
          console.log('✓ Deregistered from Thing Directory')
        }
      } catch (err) {
        console.log(`⚠️ Could not deregister: ${err.message}`)
      }
    }
    process.exit(0)
  })
}