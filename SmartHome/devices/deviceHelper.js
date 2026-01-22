import coreModule from '@node-wot/core'
import bindingModule from '@node-wot/binding-http'
import getPort from 'get-port'

const { Servient, Helpers } = coreModule
const { HttpServer } = bindingModule

const things = {}

export async function startDevice({ td, handlers = {}, route, directoryUrl = 'http://localhost:8080/things', onExposed }) {
  const port = await getPort()
  const httpServer = new HttpServer({ port })
  const servient = new Servient()
  Helpers.setStaticAddress('localhost')
  servient.addServer(httpServer)

  const WoTInstance = await servient.start()
  const thing = await WoTInstance.produce(td)
  // Attach handlers
  for (const [type, map] of Object.entries(handlers)) {
    for (const [name, fn] of Object.entries(map)) {
      thing[type](name, fn)
    }
  }
  await thing.expose()
  things[route] = thing

  // Serve TD at /<route>
  if (httpServer._app) {
    httpServer._app.get(`/${route}`, (req, res) => {
      res.setHeader('Content-Type', 'application/td+json')
      res.send(thing.getThingDescription())
    })
  }

  console.log(`\n${td.title} running at http://localhost:${port}/${route}`)
  // console.log('Thing Description:', JSON.stringify(thing.getThingDescription(), null, 2))

  // Register with Thing Directory
  setTimeout(async () => {
    try {
      const thingDescription = thing.getThingDescription()
      thingDescription.base = `http://localhost:${port}/${route}`
      thingDescription.protocol = 'http'
      const response = await fetch(directoryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/td+json' },
        body: JSON.stringify(thingDescription)
      })
      if (response.ok) {
        console.log('✓ Registered with Thing Directory')
      }
    } catch (err) {
      console.log(`⚠️ Could not register: ${err.message}`)
    }
  }, 1000)

  if (typeof onExposed === 'function') {
    onExposed(thing)
  }

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