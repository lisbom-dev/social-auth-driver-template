import Route from '@ioc:Adonis/Core/Route'
import User from 'App/Models/User'

Route.get('/instagram/redirect', async ({ ally, auth, response }) => {
  if (await auth.check()) {
    return response.notAcceptable()
  }

  return response.redirect(await ally.use('instagram').stateless().redirectUrl())
})

Route.get('/tiktok/redirect', async ({ ally, auth, response }) => {
  if (await auth.check()) {
    return response.notAcceptable()
  }

  return response.redirect(await ally.use('tiktok').stateless().redirectUrl())
})

Route.get('/auth/instagram/callback', async ({ ally, auth, response }) => {
  if (await auth.check()) {
    return response.notAcceptable()
  }

  const instagram = ally.use('instagram').stateless()
  if (instagram.accessDenied()) {
    return 'Access Denied'
  }

  if (instagram.hasError()) {
    return instagram.getError()
  }

  const instagramUser = await instagram.user()

  const user = await User.firstOrCreate({
    email: instagramUser.email!,
  })

  const oat = await auth.use('api').login(user, {
    expiresIn: '7days',
  })

  return response.ok({ user, token: oat })
})
