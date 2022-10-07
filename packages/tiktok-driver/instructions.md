The package has been configured successfully!

Make sure to first define the mapping inside the `contracts/ally.ts` file as follows.

```ts
import { TikTokDriver, TikTokDriverConfig } from 'ally-tiktok-driver/build/standalone'

declare module '@ioc:Adonis/Addons/Ally' {
  interface SocialProviders {
    // ... other mappings
    TikTokDriver: {
      config: TikTokDriverConfig
      implementation: TikTokDriver
    }
  }
}
```
