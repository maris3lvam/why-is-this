/**
 * @fileoverview Central configuration manager for why-is-this.
 *
 * Provides typed, validated, central configuration across all domain engines.
 * Avoids global mutable state — allows creating custom config instances
 * while maintaining safe default options.
 */

import type { InspectionLimits } from './limits.js';
import { DEFAULT_LIMITS, mergeLimits } from './limits.js';

export interface SecretPattern {
  readonly name: string;
  readonly pattern: RegExp;
}

export interface SecurityConfig {
  /** Auto-redact sensitive environment variables and HTTP headers */
  readonly autoRedact: boolean;
  /** Custom secret patterns to detect/mask */
  readonly secretPatterns: readonly SecretPattern[];
  /** Mask string replacement */
  readonly maskString: string;
}

export interface DiagnosticConfig {
  readonly limits: InspectionLimits;
  readonly security: SecurityConfig;
  readonly maxSessionEvents: number;
}

export const DEFAULT_SECURITY_PATTERNS: readonly SecretPattern[] =
  Object.freeze([
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
    { name: 'Bearer / JWT Token', pattern: /bearer\s+[a-zA-Z0-9._~+/]+=*/i },
    {
      name: 'Generic Secret Key',
      pattern:
        /(?:secret|password|passwd|apiKey|token|authorization|cookie|set-cookie)\s*[:=]\s*\S+/i,
    },
  ]);

export const DEFAULT_CONFIG: Readonly<DiagnosticConfig> = Object.freeze({
  limits: DEFAULT_LIMITS,
  security: Object.freeze({
    autoRedact: true,
    secretPatterns: DEFAULT_SECURITY_PATTERNS,
    maskString: '[REDACTED]',
  }),
  maxSessionEvents: 1000,
});

class ConfigManager {
  private currentConfig: DiagnosticConfig = { ...DEFAULT_CONFIG };

  public get(): DiagnosticConfig {
    return this.currentConfig;
  }

  public configure(overrides: Partial<DiagnosticConfig>): DiagnosticConfig {
    this.currentConfig = Object.freeze({
      limits: overrides.limits
        ? mergeLimits(overrides.limits)
        : this.currentConfig.limits,
      security: overrides.security
        ? Object.freeze({
            autoRedact:
              overrides.security.autoRedact ??
              this.currentConfig.security.autoRedact,
            secretPatterns: overrides.security.secretPatterns
              ? Object.freeze([...overrides.security.secretPatterns])
              : this.currentConfig.security.secretPatterns,
            maskString:
              overrides.security.maskString ??
              this.currentConfig.security.maskString,
          })
        : this.currentConfig.security,
      maxSessionEvents:
        overrides.maxSessionEvents ?? this.currentConfig.maxSessionEvents,
    });
    return this.currentConfig;
  }

  public reset(): DiagnosticConfig {
    this.currentConfig = { ...DEFAULT_CONFIG };
    return this.currentConfig;
  }
}

export const globalConfig = new ConfigManager();
