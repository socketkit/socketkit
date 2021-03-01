import scraper from 'app-store-scraper'

const country_ids = [
  'ae',
  'ag',
  'ai',
  'al',
  'am',
  'ao',
  'ar',
  'at',
  'au',
  'az',
  'bb',
  'be',
  'bf',
  'bg',
  'bh',
  'bj',
  'bm',
  'bn',
  'bo',
  'br',
  'bs',
  'bt',
  'bw',
  'by',
  'bz',
  'ca',
  'cg',
  'ch',
  'cl',
  'cn',
  'co',
  'cr',
  'cv',
  'cy',
  'cz',
  'de',
  'dk',
  'dm',
  'do',
  'dz',
  'ec',
  'ee',
  'eg',
  'es',
  'fi',
  'fj',
  'fm',
  'fr',
  'gb',
  'gd',
  'gh',
  'gm',
  'gr',
  'gt',
  'gw',
  'gy',
  'hk',
  'hn',
  'hr',
  'hu',
  'id',
  'ie',
  'il',
  'in',
  'is',
  'it',
  'jm',
  'jo',
  'jp',
  'ke',
  'kg',
  'kh',
  'kn',
  'kr',
  'kw',
  'ky',
  'kz',
  'la',
  'lb',
  'lc',
  'lk',
  'lr',
  'lt',
  'lu',
  'lv',
  'md',
  'mg',
  'mk',
  'ml',
  'mn',
  'mo',
  'mr',
  'ms',
  'mt',
  'mu',
  'mw',
  'mx',
  'my',
  'mz',
  'na',
  'ne',
  'ng',
  'ni',
  'nl',
  'np',
  'no',
  'nz',
  'om',
  'pa',
  'pe',
  'pg',
  'ph',
  'pk',
  'pl',
  'pt',
  'pw',
  'py',
  'qa',
  'ro',
  'ru',
  'sa',
  'sb',
  'sc',
  'se',
  'sg',
  'si',
  'sk',
  'sl',
  'sn',
  'sr',
  'st',
  'sv',
  'sz',
  'tc',
  'td',
  'th',
  'tj',
  'tm',
  'tn',
  'tr',
  'tt',
  'tw',
  'tz',
  'ua',
  'ug',
  'us',
  'uy',
  'uz',
  'vc',
  've',
  'vg',
  'vn',
  'ye',
  'za',
  'zw',
]

export function scrape(apps_to_be_scraped, override_country_id = null) {
  return Promise.all(
    apps_to_be_scraped
      .map(async (a) => {
        let detail = null
        let country_id = override_country_id ?? a.default_country_id

        try {
          detail = await scraper.app({
            id: a.application_id,
            country: country_id,
            language: a.default_language_id,
            ratings: true,
          })
        } catch (error) {
          if (!error.message?.includes('404')) {
            throw error
          }
        }

        if (detail === null) return null

        return {
          application_id: a.application_id,
          country_id,
          default_country_id: a.default_country_id,
          default_language_id: a.default_language_id,
          detail,
        }
      })
      .filter(Boolean),
  )
}

export async function scrapeAll(apps_to_be_scraped) {
  const nested = await Promise.all(
    country_ids.map((c) => scrape(apps_to_be_scraped, c)),
  )

  return nested.flat()
}