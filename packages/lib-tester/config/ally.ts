/**
 * Config source: https://git.io/JOdi5
 *
 * Feel free to let us know via PR, if you find something broken in this config
 * file.
 */

import { AllyConfig } from '@ioc:Adonis/Addons/Ally'
import Env from '@ioc:Adonis/Core/Env'

/*
|--------------------------------------------------------------------------
| Ally Config
|--------------------------------------------------------------------------
|
| The `AllyConfig` relies on the `SocialProviders` interface which is
| defined inside `contracts/ally.ts` file.
|
*/
const allyConfig: AllyConfig = {
  /*
	|--------------------------------------------------------------------------
	| Google driver
	|--------------------------------------------------------------------------
	*/
  google: {
    driver: 'google',
    clientId: Env.get('GOOGLE_CLIENT_ID'),
    clientSecret: Env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: 'http://localhost:3000/auth/google',
  },
  instagram: {
    driver: 'instagram',
    clientId: Env.get('INSTAGRAM_CLIENT_ID'),
    clientSecret: Env.get('INSTAGRAM_CLIENT_SECRET'),
    callbackUrl: 'https://localhost:3333/auth/instagram/callback',
  },
  tiktok: {
    driver: 'tiktok',
    clientId: Env.get('TIKTOK_DRIVER_CLIENT_ID'),
    clientSecret: Env.get('TIKTOK_DRIVER_CLIENT_SECRET'),
    callbackUrl: 'https://cd86-45-164-53-18.sa.ngrok.io/auth/tiktok/callback',
    scopes: ['user.info.basic', 'video.list', 'sound.share.create', 'user.info.email'],
  },
}

export default allyConfig
