import store from './client.js'
import server, { grpc } from '../src/grpc.js'
import config from '../src/config.js'
import logger from '../src/logger.js'

beforeAll((done) => {
  logger.pauseLogs()
  server.bindAsync(
    `0.0.0.0:${config.port}`,
    grpc.ServerCredentials.createInsecure(),
    () => {
      server.start()
      done()
    },
  )
})

afterAll((done) => {
  server.forceShutdown()
  done()
})

describe('create', () => {
  test('should create facebook', (done) => {
    store.create({ application_id: '284882215' }, (error, response) => {
      try {
        expect(error).toBeNull()
        expect(response).toEqual({})
        done()
      } catch (error) {
        done(error)
      }
    })
  })
})

describe('findOne', () => {
  test('should return facebook', (done) => {
    store.findOne({ application_id: '284882215' }, (error, response) => {
      try {
        expect(error).toBeNull()
        expect(response.application_id).toBe('284882215')
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  test('should return undefined', (done) => {
    store.findOne({ application_id: '1234512345' }, (error, response) => {
      try {
        expect(response).toBe(undefined)
        done()
      } catch (error) {
        done(error)
      }
    })
  })
})

describe('findVersions', () => {
  test('should return versions', (done) => {
    store.findVersions({ application_id: '284882215' }, (error, response) => {
      try {
        expect(error).toBeNull()
        expect(response.versions).toBeInstanceOf(Array)
        response.versions.forEach((version) => {
          expect(version.application_id).toEqual('284882215')
        })
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  test('should return empty array', (done) => {
    store.findVersions({ application_id: '1234512345' }, (error, response) => {
      try {
        expect(error).toBeNull()
        expect(response.versions).toBeInstanceOf(Array)
        expect(response.versions.length).toEqual(0)
        done()
      } catch (error) {
        done(error)
      }
    })
  })
})