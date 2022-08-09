import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class TikTokDriverProvider {
  constructor(protected app: ApplicationContract) {}

  public async boot() {
    const Ally = this.app.container.resolveBinding('Adonis/Addons/Ally')
    const { TikTokDriver } = await import('../src/TikTok')

    Ally.extend('tiktok', (_, __, config, ctx) => {
      return new TikTokDriver(ctx, config)
    })
  }
}
