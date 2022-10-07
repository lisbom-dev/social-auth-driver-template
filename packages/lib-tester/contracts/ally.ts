/**
 * Contract source: https://git.io/JOdiQ
 *
 * Feel free to let us know via PR, if you find something broken in this contract
 * file.
 */
import { InstagramDriver, InstagramDriverConfig } from 'ally-instagram-driver/standalone'
import { TikTokDriverConfig, TikTokDriver } from 'ally-tiktok-driver/standalone'

declare module '@ioc:Adonis/Addons/Ally' {
  interface SocialProviders {
    google: {
      config: GoogleDriverConfig
      implementation: GoogleDriverContract
    }
    instagram: {
      config: InstagramDriverConfig
      implementation: InstagramDriver
    }
    tiktok: {
      config: TikTokDriverConfig
      implementation: TikTokDriver
    }
  }
}
