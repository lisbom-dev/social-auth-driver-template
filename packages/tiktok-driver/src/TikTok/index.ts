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

import { ApiRequest, Oauth2Driver, OauthException } from '@adonisjs/ally/build/standalone'
import type {
  AllyUserContract,
  ApiRequestContract,
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
}

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

/**
 * Driver implementation. It is mostly configuration driven except the user calls
 *
 */
export class TikTokDriver extends Oauth2Driver<TikTokDriverAccessToken, TikTokDriverScopes> {
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl = 'https://open-api.tiktok.com/oauth'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl = 'https://open-api.tiktok.com/access_token'

  /**
   * The URL to hit to get the user details
   *
   * Do not define query strings in this URL.
   */
  protected userInfoUrl = ''

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'tiktok_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  constructor(ctx: HttpContextContract, public config: TikTokDriverConfig) {
    super(ctx, config)

    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request.
     *
     * DO NOT REMOVE THE FOLLOWING LINE
     */
    this.loadState()
  }

  /**
   * Optionally configure the authorization redirect request. The actual request
   * is made by the base implementation of "Oauth2" driver and this is a
   * hook to pre-configure the request.
   */
  protected configureRedirectRequest(request: RedirectRequestContract<TikTokDriverScopes>) {
    request.scopes(this.config.scopes || ['user.info.basic'])

    request.param('client_id', this.config.clientId)
    request.param('redirect_uri', this.authorizeUrl)
    request.param('response_type', 'code')
    request.param('grant_type', 'authorization_code')
  }

  /**
   * Optionally configure the access token request. The actual request is made by
   * the base implementation of "Oauth2" driver and this is a hook to pre-configure
   * the request
   */
  // protected configureAccessTokenRequest(request: RedirectRequestContract<TikTokDriverScopes>) {}

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */

  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  protected async getUserInfo(token: string): Promise<AppleUserContract> {
    const signingKey = await this.getAppleSigningKey(token)
    const decodedUser = JWT.verify(token, signingKey, {
      issuer: 'https://appleid.apple.com',
      audience: this.config.appId,
    })
    const firstName = (decodedUser as AppleTokenDecoded)?.user?.name?.firstName || ''
    const lastName = (decodedUser as AppleTokenDecoded)?.user?.name?.lastName || ''

    return {
      id: (decodedUser as AppleTokenDecoded).sub,
      avatarUrl: null,
      original: null,
      nickName: (decodedUser as AppleTokenDecoded).sub,
      name: `${firstName}${lastName ? ` ${lastName}` : ''}`,
      email: (decodedUser as AppleTokenDecoded).email,
      emailVerificationState:
        (decodedUser as AppleTokenDecoded).email_verified === 'true' ? 'verified' : 'unverified',
    }
  }

  public async accessToken(
    callback?: (request: ApiRequestContract) => void
  ): Promise<TikTokDriverAccessToken> {
    /**
     * We expect the user to handle errors before calling this method
     */
    if (this.hasError()) {
      throw OauthException.missingAuthorizationCode(this.codeParamName)
    }

    /**
     * We expect the user to properly handle the state mis-match use case before
     * calling this method
     */
    if (this.stateMisMatch()) {
      throw OauthException.stateMisMatch()
    }

    return this.getAccessToken((request) => {
      request.header('Content-Type', 'application/x-www-form-urlencoded')
      request.field('client_id', this.config.clientId)
      request.field('client_secret', this.config.clientSecret)
      request.field(this.codeParamName, this.getCode())

      if (typeof callback === 'function') {
        callback(request)
      }
    })
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
