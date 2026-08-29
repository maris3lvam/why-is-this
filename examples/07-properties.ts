/**
 * @fileoverview Example 07: Property Path & Access
 *
 * Covers: why.path() · why.get() · why.has() · why.exists() ·
 *         why.missing() · why.undefined() · why.null() ·
 *         why.resolve() · why.optional()
 *
 * These APIs navigate nested object graphs safely — never throwing on
 * missing intermediate nodes, never executing getters accidentally.
 */

import why from '../src/index.js';

// ─── Section 1: why.has() — Key Existence Check ───────────────────────────────

console.log('─── 1. why.has() — Key Existence Without Value Check ───');

// The critical difference: has() checks the key EXISTS — not whether the value is truthy.
const formData = { username: 'alice', avatar: undefined };

// avatar key IS present in the object even though its value is undefined
console.log(why.has(formData, 'username')); // → true
console.log(why.has(formData, 'avatar')); // → true   (key exists, value is undefined)
console.log(why.has(formData, 'email')); // → false  (key does not exist)

// Without why.has() this common check is WRONG:
console.log('formData.avatar' in formData); // → true  (correct native alternative)
console.log(formData.avatar != null); // → false (WRONG — doesn't check key existence!)

// Symbol keys
const symKey = Symbol('meta');
const withSym: Record<string | symbol, unknown> = {
  id: 1,
  [symKey]: 'metadata',
};
console.log(why.has(withSym, symKey)); // → true

// ─── Section 2: why.undefined() / why.null() — Value State Check ─────────────

console.log('\n─── 2. why.undefined() · why.null() — Value State Check ───');

const response = {
  data: null, // explicitly null (server returned null)
  error: undefined, // explicitly undefined (caller didn't set it)
  count: 0, // valid falsy number
};

// why.undefined checks if a property VALUE is undefined (key may still exist)
console.log(why.undefined(response, 'error')); // → true   (value is undefined)
console.log(why.undefined(response, 'data')); // → false  (value is null, not undefined)
console.log(why.undefined(response, 'count')); // → false  (value is 0)

// why.null checks if a property VALUE is null
console.log(why.null(response, 'data')); // → true   (value is null)
console.log(why.null(response, 'error')); // → false  (value is undefined, not null)

// ─── Section 3: why.get() — Getter-Safe Property Read ────────────────────────

console.log('\n─── 3. why.get() — Safe Property Read ───');

class ApiService {
  private _apiKey = 'sk-prod-abc123';

  get apiKey(): string {
    console.log('[SIDE EFFECT] apiKey getter called!');
    return this._apiKey;
  }

  get status(): string {
    return 'connected';
  }
}

const service = new ApiService();

// Normal data property — returns SafeValue with kind 'primitive'
const statusVal = why.get(service, 'status');
console.log('status kind:', statusVal.kind); // → 'accessor'  (getter detected)

// Private property stored on instance (via convention)
const keyVal = why.get(service, '_apiKey');
console.log('_apiKey kind:', keyVal.kind); // → 'primitive'
console.log('_apiKey value:', keyVal.value); // → 'sk-prod-abc123'

// ─── Section 4: why.exists() — Deep Path Existence ───────────────────────────

console.log('\n─── 4. why.exists() — Deep Nested Path Check ───');

const config = {
  database: {
    primary: {
      host: 'db.example.com',
      port: 5432,
    },
  },
};

console.log(why.exists(config, 'database.primary.host')); // → true
console.log(why.exists(config, 'database.primary.port')); // → true
console.log(why.exists(config, 'database.replica.host')); // → false (replica doesn't exist)
console.log(why.exists(config, 'cache.redis.url')); // → false

// ─── Section 5: why.missing() — Where Does the Path Break? ───────────────────

console.log('\n─── 5. why.missing() — First Missing Path Segment ───');

const payload = {
  user: {
    profile: {
      // address is missing!
    },
  },
};

const missingInfo = why.missing(
  payload as Record<string, unknown>,
  'user.profile.address.city',
);
console.log(missingInfo);
// Shows exactly WHERE in the path it broke: 'user.profile.address'

// ─── Section 6: why.path() / why.resolve() — Path Resolution ─────────────────

console.log('\n─── 6. why.path() / why.resolve() — Nested Path Read ───');

const server = {
  config: {
    tls: {
      enabled: true,
      cert: '/etc/ssl/cert.pem',
    },
  },
};

const resolved = why.path(server as Record<string, unknown>, 'config.tls.cert');
console.log('resolved value:', resolved); // → '/etc/ssl/cert.pem'

// resolve() is an alias — same behavior
const same = why.resolve(
  server as Record<string, unknown>,
  'config.tls.enabled',
);
console.log('resolve alias:', same); // → true

// Missing path — returns undefined without throwing
const missing = why.path(server as Record<string, unknown>, 'config.redis.url');
console.log('missing path:', missing); // → undefined (no throw)

// ─── Section 7: why.optional() — Path with Fallback ─────────────────────────

console.log('\n─── 7. why.optional() — Path Read with Default Fallback ───');

const prefs = {
  notifications: {
    email: true,
    // sms is missing
  },
};

const emailPref = why.optional(
  prefs as Record<string, unknown>,
  'notifications.email',
  false,
);
console.log('email pref:', emailPref); // → true

const smsPref = why.optional(
  prefs as Record<string, unknown>,
  'notifications.sms',
  false,
);
console.log('sms pref (fallback):', smsPref); // → false  (path missing → fallback)

const pushPref = why.optional(
  prefs as Record<string, unknown>,
  'notifications.push',
  'enabled',
);
console.log('push pref (fallback):', pushPref); // → 'enabled'
