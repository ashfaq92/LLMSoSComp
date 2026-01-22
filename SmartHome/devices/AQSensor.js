import { startDevice } from './deviceHelper.js'

const td = {
  title: 'Air Quality Sensor',
  description: 'A sensor that measures air quality (AQI) and supports calibration',
  properties: {
    airQuality: {
      type: 'integer',
      title: 'Air Quality Index',
      description: 'Current AQI (0-500, lower is better)',
      readOnly: true,
      minimum: 0,
      maximum: 500
    },
    lastCalibration: {
      type: 'string',
      title: 'Last Calibration',
      description: 'Timestamp of last calibration',
      readOnly: true
    }
  },
  actions: {
    calibrate: {
      title: 'Calibrate Sensor',
      description: 'Calibrate the air quality sensor',
      input: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Calibration code (for security)'
          }
        },
        required: ['code']
      }
    }
  }
}

let state = {
  airQuality: 50,
  lastCalibration: null
}

const handlers = {
  setPropertyReadHandler: {
    airQuality: async () => {
      console.log(`🌫️ Reading air quality: AQI ${state.airQuality}`)
      return state.airQuality
    },
    lastCalibration: async () => state.lastCalibration
  },
  setActionHandler: {
    calibrate: async (input) => {
      const inputData = await input.value()
      const { code } = inputData || {}
      if (code !== 'secret123') throw new Error('Invalid calibration code')
      state.lastCalibration = new Date().toISOString()
      console.log(`🌫️ Sensor calibrated at ${state.lastCalibration}`)
      return { status: 'calibrated', time: state.lastCalibration }
    }
  }
}

startDevice({
  td,
  handlers,
  onExposed: () => {
    setInterval(() => {
      state.airQuality = Math.max(0, Math.min(500, state.airQuality + (Math.random() - 0.5) * 10))
      state.airQuality = Math.round(state.airQuality)
    }, 3000)
  }
})