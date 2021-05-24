import { useRouter } from 'next/router'
import PropTypes from 'prop-types'
import useSWR from 'swr'

import Banner from 'components/banner.js'
import Container from 'components/container.js'
import Footer from 'components/menu/footer.js'
import Header from 'components/menu/header.js'
import SettingsHeader from 'components/menu/settings-header.js'

function AuthorizedLayout({ children }) {
  const router = useRouter()
  const { data: integration } = useSWR('integrations/appstore-connect')

  return (
    <>
      <Header />
      {router.pathname.startsWith('/account') && <SettingsHeader />}
      <Container>{children}</Container>
      <Footer />

      {integration !== null && integration?.access_token === null && (
        <Banner
          destination="/account/integrations"
          longMessage="Please, add an integration for Socketkit to work."
          shortMessage="Please, add an integration."
        />
      )}
    </>
  )
}

AuthorizedLayout.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
}

export default AuthorizedLayout
