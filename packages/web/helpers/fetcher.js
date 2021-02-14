process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

export async function fetcher(resource, options = {}) {
  return fetch(`${process.env.API_URL}/${resource}`, {
    credentials: 'include',
    ...options,
  }).then((res) => res.json())
}