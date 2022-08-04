import Route from '@ioc:Adonis/Core/Route'
import User from 'App/Models/User'

Route.get('/google/redirect', async ({ auth, ally, response }) => {
  if (await auth.check()) {
    return response.notAcceptable()
  }

  return response.redirect(await ally.use('google').stateless().redirectUrl())
})

Route.get('/google/callback', async ({ auth, ally, response }) => {
  if (await auth.check()) {
    return response.notAcceptable()
  }

  const google = ally.use('google').stateless()

  if (google.accessDenied()) {
    return 'Access Denied'
  }

  if (google.hasError()) {
    return google.getError()
  }

  const { token } = await google.accessToken()
  const googleUser = await google.userFromToken(token)

  const user = await User.firstOrCreate({
    email: googleUser.email!,
  })

  const oat = await auth.use('api').login(user, {
    expiresIn: '7days',
  })

  return response.ok({ user, token: oat })
})
