import express from 'express'

const app = express()
// app.use(express.json())

app.use(express.json({
  type: [
    'application/json',
    'application/td+json'
  ]
}))


// In-memory TD storage
const things = new Map()

console.log('\n═══════════════════════════════════════════════════════')
console.log('  📚 W3C WoT Thing Directory')
console.log('═══════════════════════════════════════════════════════\n')

// Thing Directory API

// 1. Register a new TD
app.post('/things', (req, res) => {
  const td = req.body

  if (!td || Object.keys(td).length === 0) {
    console.error('✗ Registration failed: empty request body')
    return res.status(400).json({
      error: 'Request body is empty. Did you forget to send JSON or set Content-Type to application/json?'
    })
  }

  if (!td.id) {
    console.error('✗ Registration failed: missing id', td)
    return res.status(400).json({
      error: 'TD must have an id'
    })
  }

  things.set(td.id, {
    td,
    registered: new Date().toISOString()
  })

  console.log(`✓ Registered: ${td.title ?? 'Untitled'} (${td.id})`)

  res.status(201).json({
    id: td.id,
    message: 'Thing registered successfully'
  })
})


// 2. Get all TDs
app.get('/things', (req, res) => {
  const allTDs = Array.from(things.values()).map(entry => entry.td)
  res.json(allTDs)
})

// 3. Get specific TD by ID
app.get('/things/:id', (req, res) => {
  const entry = things.get(req.params.id)
  
  if (!entry) {
    return res.status(404).json({ error: 'Thing not found' })
  }
  
  res.json(entry.td)
})

// 4. Update TD
app.put('/things/:id', (req, res) => {
  if (!things.has(req.params.id)) {
    return res.status(404).json({ error: 'Thing not found' })
  }
  
  const td = req.body
  things.set(req.params.id, {
    td,
    registered: things.get(req.params.id).registered,
    updated: new Date().toISOString()
  })
  
  console.log(`✓ Updated: ${td.title} (${td.id})`)
  res.json({ message: 'Thing updated successfully' })
})

// 5. Delete TD
app.delete('/things/:id', (req, res) => {
  if (!things.has(req.params.id)) {
    return res.status(404).json({ error: 'Thing not found' })
  }
  
  const td = things.get(req.params.id).td
  things.delete(req.params.id)
  
  console.log(`✓ Deregistered: ${td.title} (${td.id})`)
  res.json({ message: 'Thing deleted successfully' })
})

// 6. Search TDs
app.get('/search', (req, res) => {
  const { type, title } = req.query
  
  let results = Array.from(things.values()).map(entry => entry.td)
  
  if (type) {
    results = results.filter(td => 
      td['@type'] && td['@type'].includes(type)
    )
  }
  
  if (title) {
    results = results.filter(td => 
      td.title.toLowerCase().includes(title.toLowerCase())
    )
  }
  
  res.json(results)
})

// 7. Directory's self-description
app.get('/.well-known/wot', (req, res) => {
  res.json({
    '@context': 'https://www.w3.org/2022/wot/td/v1.1',
    '@type': 'ThingDirectory',
    id: 'urn:uuid:thing-directory-001',
    title: 'WoT Thing Directory',
    description: 'A directory service for discovering WoT Things',
    securityDefinitions: {
      'nosec_sc': { 'scheme': 'nosec' }
    },
    security: 'nosec_sc',
    actions: {
      registerThing: {
        description: 'Register a new Thing Description',
        forms: [{
          href: 'http://localhost:8080/things',
          'htv:methodName': 'POST',
          contentType: 'application/td+json'
        }]
      }
    },
    properties: {
      things: {
        description: 'List of all registered Things',
        readOnly: true,
        type: 'array',
        forms: [{
          href: 'http://localhost:8080/things',
          'htv:methodName': 'GET'
        }]
      }
    }
  })
})

const PORT = 8080
app.listen(PORT, () => {
  console.log(`📚 Thing Directory running on http://localhost:${PORT}`)
  console.log(`   Registry API: http://localhost:${PORT}/things`)
  console.log(`   Search API: http://localhost:${PORT}/search`)
  console.log(`   Self-description: http://localhost:${PORT}/.well-known/wot`)
  console.log(`\n⏳ Waiting for devices to register...\n`)
});