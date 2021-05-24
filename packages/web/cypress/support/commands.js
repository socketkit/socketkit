Cypress.Commands.add('login', (user) => {
  cy.clearCookies()
  cy.visit('https://web.socketkit.com')
  cy.get(`input[name='password_identifier']`).type(user.email).should('have.value', user.email)
  cy.get(`input[name='password']`).type(user.password).should('have.value', user.password)
  cy.get(`button[value='password']`).click()
})

Cypress.Commands.add('goToRoot', () => cy.visit('https://web.socketkit.com'))