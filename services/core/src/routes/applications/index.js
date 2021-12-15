import getAll from './all.js'
import getById from './by-id.js'
import getCountries from './countries.js'
import getCustomers from './customers.js'
import getPackages from './packages.js'
import getStatistics from './statistics.js'
import getTransactions from './transactions.js'
import getVersions from './versions.js'

export default (f, _opts, done) => {
  f.route(getAll)
  f.route(getById)
  f.route(getStatistics)
  f.route(getCustomers)
  f.route(getTransactions)
  f.route(getPackages)
  f.route(getCountries)
  f.route(getVersions)
  done()
}
