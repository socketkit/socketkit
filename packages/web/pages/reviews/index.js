import { useMemo, useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import useSWR from 'swr'

import Select from 'components/form/select'
import DatePicker from 'components/date-picker'
import Table from 'components/table/table'
import InlineRating from 'components/inline-rating'
import { fetcher } from 'helpers/fetcher.js'

export async function getServerSideProps({ query = {}, req: { headers } }) {
  const format = 'YYYY-MM-DD'
  const {
    start_date = dayjs().subtract(3, 'month').format(format),
    end_date = dayjs().format(format),
  } = query
  const { cookie, referer } = headers ?? {}
  const initialData = await fetcher(`reviews?from=${start_date}&to=${end_date}`, {
    headers: { cookie, referer },
  })
  return {
    props: { initialData },
  }
}

function Reviews({ initialData }) {
  const { data: applications } = useSWR(`integrations/reviews`, { refreshInterval: 0 })
  const [applicationFilter, setApplicationFilter] = useState(null)
  const [versionFilter, setVersionFilter] = useState(null)
  const [availableVersions, setAvailableVersions] = useState([])
  const router = useRouter()
  const { start_date, end_date } = router.query

  useEffect(() => {
    async function process() {
      const { rows } = await fetcher(`reviews/versions/${applicationFilter}`)
      setAvailableVersions(rows)
    }

    setVersionFilter(null)

    if (!!applicationFilter) {
      process()
    }
  }, [applicationFilter])

  if (!start_date || !end_date) {
    router.push(
      {
        path: '/reviews',
        query: {
          start_date: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
          end_date: dayjs().format('YYYY-MM-DD'),
        },
      },
      undefined,
      { shallow: true },
    )
    return null
  }

  const columns = useMemo(
    () => [
      {
        id: 'country_id',
        accessor: function CountryAccessor(fields) {
          const country_id = fields.country_id.toUpperCase()
          return (
            <div className="flex flex-row space-x-2 flex-1">
              {country_id}
              <InlineRating rating={fields.score ?? 1} className="ml-1" />
            </div>
          )
        },
        className: 'text-left font-semibold w-24',
      },
      {
        Header: 'Version',
        accessor: 'version_number',
        className: 'text-left w-20',
      },
      {
        Header: 'Content',
        accessor: function ContentAccessor(field) {
          return (
            <div className="space-y-1 w-full relative overflow-hidden">
              <div className="text-xs font-semibold">
                {field.title} -{' '}
                <a className="font-bold hover:text-orange-400" href={field.user_url}>
                  {field.username}
                </a>
              </div>
              <p className="text-sm line-clamp-2">{field.content}</p>
            </div>
          )
        },
        className: 'text-left',
      },
    ],
    [],
  )

  return (
    <>
      <div className="flex flex-1 justify-between mb-8 items-center">
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-gray-900 sm:tracking-tight text-3xl">Reviews</h3>
        </div>
        <DatePicker
          interval={{ start_date: dayjs(start_date), end_date: dayjs(end_date) }}
          setInterval={({ start_date, end_date }) => {
            router.push(
              {
                path: '/reviews',
                query: {
                  start_date: start_date.format('YYYY-MM-DD'),
                  end_date: end_date.format('YYYY-MM-DD'),
                },
              },
              undefined,
              { shallow: true },
            )
          }}
        />
      </div>
      <div className="flex flex-1 mb-2 items-center space-x-4">
        <Select
          selected={applicationFilter}
          setSelected={setApplicationFilter}
          values={applications ?? []}
          renderer={({ application_title }) => application_title}
          rendererKey="application_id"
          subtitleRenderer={({ country_ids }) => `Tracking ${country_ids.length} countries`}
          buttonRenderer={(_, { application_title } = {}) =>
            !!application_title ? application_title : 'Applications'
          }
        />
        {applicationFilter && availableVersions.length > 0 && (
          <Select
            selected={versionFilter}
            setSelected={setVersionFilter}
            values={availableVersions ?? []}
            renderer={({ version }) => `v${version}`}
            rendererKey="version"
            subtitleRenderer={({ released_at }) =>
              released_at ? `Released at ${dayjs(released_at).format('DD/MM/YYYY')}` : null
            }
            buttonRenderer={(item) => (!!item ? `Version ${item}` : 'Versions')}
          />
        )}
        <div></div>
      </div>
      <Table
        initialData={initialData}
        url="reviews"
        options={{
          from: dayjs(start_date).format('YYYY-MM-DD'),
          to: dayjs(end_date).format('YYYY-MM-DD'),
          ...(applicationFilter ? { application_id: applicationFilter } : null),
          ...(!!applicationFilter && !!versionFilter ? { version: versionFilter } : null),
        }}
        columns={columns}
        getRowProps={({ original }) => ({
          id: original.review_id,
          className: 'h-14 hover:bg-warmGray-50 cursor-pointer',
        })}
      />
    </>
  )
}

export default Reviews
