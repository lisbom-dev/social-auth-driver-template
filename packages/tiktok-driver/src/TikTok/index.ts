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

import { ApiRequest, Oauth2Driver } from '@adonisjs/ally/build/standalone'
import type {
  AllyUserContract,
  LiteralStringUnion,
  RedirectRequestContract,
} from '@ioc:Adonis/Addons/Ally'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

/**
 * Define the access token object properties in this type. It
 * must have "token" and "type" and you are free to add
 * more properties.
 *
 * ------------------------------------------------
 * Change "YourDriver" to something more relevant
 * ------------------------------------------------
 */
export type TikTokDriverAccessToken = {
  token: string
  type: 'bearer'
  accessToken: string
  userId: string
}
export interface TikTokUserContract
  extends Omit<AllyUserContract<TikTokDriverAccessToken>, 'token'> {}
/**
 * Define a union of scopes your driver accepts. Here's an example of same
 * https://github.com/adonisjs/ally/blob/develop/adonis-typings/ally.ts#L236-L268
 *
 * ------------------------------------------------
 * Change "YourDriver" to something more relevant
 * ------------------------------------------------
 */
export type TikTokDriverScopes = 'user.info.basic' | 'video.list' | 'sound.share.create'

/**
 * Define the configuration options accepted by your driver. It must have the following
 * properties and you are free add more.
 *
 */
export type TikTokDriverConfig = {
  driver: 'tiktok'
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
  scopes?: LiteralStringUnion<TikTokDriverScopes>[]
}

export type TikTokTokenDecoded = {
  open_id: string
  union_id: string
  avatar_url: string
  avatar_url_100: string
  avatar_large_url: string
  display_name: string
  bio_description: string
  profile_deep_link: string
}

/**
 * Driver implementation. It is mostly configuration driven except the user calls
 *
 */
export class TikTokDriver extends Oauth2Driver<TikTokDriverAccessToken, TikTokDriverScopes> {
  protected authorizeUrl = 'https://open-api.tiktok.com/oauth/authorize'

  protected accessTokenUrl = 'https://open-api.tiktok.com/access_token'

  protected userInfoUrl = 'https://open-api.tiktok.com/user/info'

  protected codeParamName = 'code'

  protected errorParamName = 'error'

  protected stateCookieName = 'tiktok_oauth_state'

  protected stateParamName = 'state'

  protected scopeParamName = 'scope'

  protected scopesSeparator = ','

  constructor(ctx: HttpContextContract, public config: TikTokDriverConfig) {
    super(ctx, config)
    this.loadState()
  }

  protected configureRedirectRequest(request: RedirectRequestContract<TikTokDriverScopes>) {
    const csrfState = Math.random().toString(36).substring(2)
    request.scopes(this.config.scopes || ['user.info.basic'])
    request.param('client_key', this.config.clientId)
    request.param('redirect_uri', this.config.callbackUrl)
    request.param('response_type', 'code')
    request.param('state', csrfState)
  }

  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  protected getAuthenticatedRequest(token: string) {
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    request.header('Accept', 'application/json')
    request.param('access_token', token)
    request.parseAs('json')
    return request
  }

  protected async getUserInfo(token: string): Promise<TikTokUserContract> {
    const request = this.getAuthenticatedRequest(token)
    const decodedUser = await request.post()
    return {
      id: (decodedUser as TikTokTokenDecoded).open_id,
      avatarUrl: (decodedUser as TikTokTokenDecoded).avatar_url,
      original: decodedUser,
      nickName: (decodedUser as TikTokTokenDecoded).display_name,
      name: (decodedUser as TikTokTokenDecoded).display_name,
      email: null,
      emailVerificationState: 'unverified',
    }
  }

  /**
   * Get the user details by query the provider API. This method must return
   * the access token and the user details both. Checkout the google
   * implementation for same.
   *
   * https://github.com/adonisjs/ally/blob/develop/src/Drivers/Google/index.ts#L191-L199
   */
  public async user(
    callback?: (request: ApiRequest) => void
  ): Promise<AllyUserContract<TikTokDriverAccessToken>> {
    const token = await this.accessToken(callback)
    const user = await this.userFromToken(token.token)

    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if required)
     */
    return {
      ...user,
      token,
    }

    /**
     * Write your implementation details here
     */
  }

  public async userFromToken(token: string) {
    const user = await this.getUserInfo(token)

    return {
      ...user,
      token: { token, type: 'bearer' as const },
    }
  }
}
