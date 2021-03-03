import Link from 'next/link'
import PropTypes from 'prop-types'
import cx from 'classnames'
import { useRouter } from 'next/router'

function Tabs({ selected, items }) {
  const router = useRouter()
  return (
    <>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md">
          {items.map((item) => (
            <option
              key={item.key}
              selected={item.key === selected}
              onSelect={() => router.push(item.href)}>
              {item.title}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {items.map((item) => (
              <Link href={item.href} key={item.key}>
                <a
                  className={cx([
                    'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
                    item.key === selected
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  ])}>
                  {item.title}
                </a>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  )
}

Tabs.propTypes = {
  selected: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
    }),
  ).isRequired,
}

export default Tabs
