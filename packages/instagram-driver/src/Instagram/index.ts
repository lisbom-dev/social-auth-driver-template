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
  RedirectRequestContract,
} from '@ioc:Adonis/Addons/Ally'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import JWT from 'jsonwebtoken'
import { CertSigningKey, JwksClient, RsaSigningKey } from 'jwks-rsa'

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
  iss: string
  aud: string
  exp: number
  iat: number
  sub: string
  at_hash: string
  email: string
  email_verified: 'true' | 'false'
  user?: {
    email?: string
    name?: {
      firstName: string
      lastName: string
    }
  }
  is_private_email: boolean
  auth_time: number
  nonce_supported: boolean
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
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl = 'https://api.instagram.com/oauth/authorize'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl = 'https://api.instagram.com/oauth/access_token'

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
  protected stateCookieName = 'instagram_oauth_state'

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

  protected jwksClient: JwksClient | null = null

  constructor(ctx: HttpContextContract, public config: InstagramDriverConfig) {
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

  protected async getInstagramSigningKey(token): Promise<string> {
    const decodedToken = JWT.decode(token, { complete: true })
    const key = await this.jwksClient?.getSigningKey(decodedToken?.header.kid)
    return (key as CertSigningKey)?.publicKey || (key as RsaSigningKey)?.rsaPublicKey
  }

  protected async getUserInfo(token: string): Promise<InstagramUserContract> {
    const signingKey = await this.getInstagramSigningKey(token)
    const decodedUser = JWT.verify(token, signingKey, {
      issuer: this.accessTokenUrl,
      audience: this.config.clientId,
    })

    return {
      id: (decodedUser as InstagramTokenDecoded).sub,
      avatarUrl: null,
      original: null,
      nickName: (decodedUser as InstagramTokenDecoded).sub,
      name: (decodedUser as InstagramTokenDecoded).sub,
      email: (decodedUser as InstagramTokenDecoded).email,
      emailVerificationState:
        (decodedUser as InstagramTokenDecoded).email_verified === 'true'
          ? 'verified'
          : 'unverified',
    }
  }

  protected configureRedirectRequest(request: RedirectRequestContract<InstagramDriverScopes>) {
    request.scopes(this.config.scopes || ['user_profile'])

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
  // protected configureAccessTokenRequest(request: ApiRequest) {
  //   request.post()
  // }

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */
  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  /**
   * Get the user details by query the provider API. This method must return
   * the access token and the user details both. Checkout the google
   * implementation for same.
   *
   * https://github.com/adonisjs/ally/blob/develop/src/Drivers/Google/index.ts#L191-L199
   */
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
