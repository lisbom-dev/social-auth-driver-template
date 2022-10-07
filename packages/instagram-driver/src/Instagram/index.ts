/*
|--------------------------------------------------------------------------
| Ally Oauth driver
|--------------------------------------------------------------------------
|
| This is a dummy implementation of the Oauth driver. Make sure you
|
| - Got through every line of code
| - Read every comment
|
*/

import { Oauth2Driver } from '@adonisjs/ally/build/standalone'
import type {
  AllyUserContract,
  ApiRequestContract,
  LiteralStringUnion,
  Oauth2DriverConfig,
  RedirectRequestContract
} from '@ioc:Adonis/Addons/Ally'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { JwksClient } from 'jwks-rsa'

/**
 * Define the access token object properties in this type. It
 * must have "token" and "type" and you are free to add
 * more properties.
 *
 */
export type InstagramAccessToken = {
  token: string
  type: 'bearer'
  accessToken: string
  userId: string
}

export type InstagramTokenDecoded = {
  id: string
  username: string
  account_type: string
  media_count: number
}

/**
 * Define a union of scopes your driver accepts. Here's an example of same
 * https://github.com/adonisjs/ally/blob/develop/adonis-typings/ally.ts#L236-L268
 *
 */
export type InstagramDriverScopes = 'user_profile' | 'user_media'

export interface InstagramUserContract
  extends Omit<AllyUserContract<InstagramAccessToken>, 'token'> {}
/**
 * Define the configuration options accepted by your driver. It must have the following
 * properties and you are free add more.
 *
 */
export type InstagramDriverConfig = Oauth2DriverConfig & {
  driver: 'instagram'
  userInfoUrl?: string
  scopes?: LiteralStringUnion<InstagramDriverScopes>[]
}

/**
 * Driver implementation. It is mostly configuration driven except the user calls
 *
 */
export class InstagramDriver extends Oauth2Driver<InstagramAccessToken, InstagramDriverScopes> {
  protected authorizeUrl = 'https://api.instagram.com/oauth/authorize'

  protected accessTokenUrl = 'https://api.instagram.com/oauth/access_token'

  protected userInfoUrl = 'https://graph.instagram.com/me'

  protected codeParamName = 'code'

  protected errorParamName = 'error'

  protected stateCookieName = 'instagram_oauth_state'

  protected stateParamName = 'state'

  protected scopeParamName = 'scope'

  protected scopesSeparator = ','

  protected jwksClient: JwksClient | null = null

  constructor(ctx: HttpContextContract, public config: InstagramDriverConfig) {
    super(ctx, config)
    this.loadState()
  }

  protected getAuthenticatedRequest(token: string) {
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    request.header('Accept', 'application/json')
    request.param('access_token', token)
    request.param('fields', 'id,username,account_type')
    request.parseAs('json')
    return request
  }

  protected async getUserInfo(token: string): Promise<InstagramUserContract> {
    const request = this.getAuthenticatedRequest(token)
    const decodedUser = await request.get()
    return {
      id: (decodedUser as InstagramTokenDecoded).id,
      avatarUrl: null,
      original: decodedUser,
      nickName: (decodedUser as InstagramTokenDecoded).username,
      name: (decodedUser as InstagramTokenDecoded).username,
      email: null,
      emailVerificationState: 'unverified',
    }
  }

  protected configureRedirectRequest(request: RedirectRequestContract<InstagramDriverScopes>) {
    request.scopes(this.config.scopes || ['user_profile'])

    request.param('client_id', this.config.clientId)
    request.param('redirect_uri', this.config.callbackUrl)
    request.param('response_type', 'code')
    request.param('grant_type', 'authorization_code')
  }

  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  public async user(callback?: (request: ApiRequestContract) => void) {
    const token = await this.accessToken(callback)
    const user = await this.getUserInfo(token.token)
    return {
      ...user,
      token,
    }
  }

  public async userFromToken(token: string) {
    const user = await this.getUserInfo(token)
    return {
      ...user,
      token: { token, type: 'bearer' as const },
    }
  }
}
