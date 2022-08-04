The package has been configured successfully!

Make sure to first define the mapping inside the `contracts/ally.ts` file as follows.

```ts
import {
  InstagramDriver,
  InstagramDriverConfig,
} from '@lisbom-dev-adonis/instagram-driver/build/standalone'

declare module '@ioc:Adonis/Addons/Ally' {
  interface SocialProviders {
    // ... other mappings
    InstagramDriver: {
      config: InstagramDriverConfig
      implementation: InstagramDriver
    }
  }
}
```
