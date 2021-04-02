import appstoreConnect from './appstore-connect/index.js'
import reviews from './reviews/index.js'

export default (f, _opts, done) => {
  f.register(appstoreConnect, { prefix: 'appstore-connect' })
  f.register(reviews, { prefix: 'reviews' })
  done()
}
