import Route from '@ioc:Adonis/Core/Route'
import User from 'App/Models/User'

Route.get('/:provider/redirect', async ({ auth, ally, params, response }) => {
  if (await auth.check()) {
    return response.notAcceptable()
  }

  return response.redirect(ally.use(params.provider).stateless().redirectUrl())
})

Route.get('/:provider/callback', async ({ auth, ally, params, response }) => {
  if (await auth.check()) {
    return response.notAcceptable()
  }

  const provider = ally.use(params.provider).stateless()

  if (provider.accessDenied()) {
    return 'Access Denied'
  }

  if (provider.hasError()) {
    return provider.getError()
  }

  const { token } = await provider.accessToken()
  const providerUser = await provider.userFromToken(token)

  const user = await User.firstOrCreate({
    email: providerUser.email!,
  })

  const oat = await auth.use('api').login(user, {
    expiresIn: '7days',
  })

  return response.ok({ user, token: oat })
})
