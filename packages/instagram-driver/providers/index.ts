import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class InstagramDriverProvider {
  constructor(protected app: ApplicationContract) {}

  public async boot() {
    const Ally = this.app.container.resolveBinding('Adonis/Addons/Ally')
    const { InstagramDriver } = await import('../src/Instagram')

    Ally.extend('instagram', (_, __, config, ctx) => {
      return new InstagramDriver(ctx, config)
    })
  }
}
