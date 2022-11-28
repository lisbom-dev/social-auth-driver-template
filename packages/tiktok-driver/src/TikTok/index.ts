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
  ApiRequestContract,
  LiteralStringUnion,
  // eslint-disable-next-line prettier/prettier
  RedirectRequestContract
} from '@ioc:Adonis/Addons/Ally'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import axios, { AxiosError } from 'axios'
import { URL } from 'url'

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
export type TikTokDriverScopes =
  | 'user.info.basic'
  | 'video.list'
  | 'sound.share.create'
  | 'user.info.email'

const fields = [
  'open_id',
  'union_id',
  'avatar_url',
  'avatar_url_100',
  'avatar_large_url',
  'display_name',
  'bio_description',
  'profile_deep_link',
  'is_verified',
  'follower_count',
  'following_count',
  'likes_count',
  'email',
]

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
  is_verified: boolean
  follower_count: number
  following_count: number
  likes_count: number
  email?: string
}

/**
 * Driver implementation. It is mostly configuration driven except the user calls
 *
 */
export class TikTokDriver extends Oauth2Driver<TikTokDriverAccessToken, TikTokDriverScopes> {
  protected authorizeUrl = 'https://www.tiktok.com/auth/authorize'

  protected accessTokenUrl = 'https://open-api.tiktok.com/oauth/access_token/'

  protected userInfoUrl = 'https://open.tiktokapis.com/v2/user/info/'

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

  protected processClientResponse(client: ApiRequest, response: any) {
    super.processClientResponse(client, response)
    return {
      access_token: response.data.access_token,
      token_type: 'bearer',
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token,
      ...response.data,
    }
  }

  protected configureAccessTokenRequest(request: ApiRequestContract): void {
    request.clearField('redirect_uri')
    request.clearField('client_id')
    request.field('client_key', this.config.clientId)
  }

  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  protected async getUserInfo(token: string): Promise<TikTokUserContract> {
    if (!this.config.scopes || !this.config.scopes.includes('user.info.email')) {
      fields.splice(
        fields.findIndex((field) => field === 'email'),
        1
      )
    }
    const {
      data: {
        data: { user: decodedUser },
      },
    } = await axios.get<{ data: { user: TikTokTokenDecoded } }>(this.userInfoUrl, {
      params: {
        fields: fields.join(','),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    let link: string
    try {
      const dl = await axios.get(decodedUser.profile_deep_link)
      link = dl.request.path
    } catch (err) {
      link = (err as AxiosError).request?.path
    }
    const username = new URL('https://a.com' + link).pathname.replace(/\//gm, '')
    return {
      id:
        (decodedUser as TikTokTokenDecoded).open_id || (decodedUser as TikTokTokenDecoded).union_id,
      avatarUrl: (decodedUser as TikTokTokenDecoded).avatar_url,
      original: decodedUser,
      nickName: (decodedUser as TikTokTokenDecoded).display_name,
      name: username,
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
