import { z } from 'zod';
import type { CustomizationConfig, ValidationResult, ValidationError } from '@craft/types';
import { validateNetworkSelection } from '@/services/stellar-network.service';

// ── Zod schema (single source of truth) ──────────────────────────────────────

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Zod schema for customization config validation.
 * Note: Network validators are intentionally lenient here; detailed validation
 * is performed in businessRuleErrors using the StellarNetworkService.
 */
export const customizationConfigSchema = z.object({
    branding: z.object({
        appName: z.string().min(1, 'App name is required').max(60, 'App name must be 60 characters or fewer'),
        logoUrl: z.string().url('Logo URL must be a valid URL').optional(),
        primaryColor: z.string().regex(HEX_COLOR, 'Primary color must be a valid hex color'),
        secondaryColor: z.string().regex(HEX_COLOR, 'Secondary color must be a valid hex color'),
        fontFamily: z.string().min(1, 'Font family is required'),
    }),
    features: z.object({
        enableCharts: z.boolean(),
        enableTransactionHistory: z.boolean(),
        enableAnalytics: z.boolean(),
        enableNotifications: z.boolean(),
    }),
    stellar: z.object({
        // Use unknown to allow detailed validation in businessRuleErrors
        network: z.unknown(),
        horizonUrl: z.string().url('Horizon URL must be a valid URL'),
        sorobanRpcUrl: z.string().url('Soroban RPC URL must be a valid URL').optional(),
        assetPairs: z.array(z.any()).optional(),
        contractAddresses: z.record(z.string()).optional(),
    }),
});

// ── Business rules ────────────────────────────────────────────────────────────

const MAINNET_HORIZON = 'https://horizon.stellar.org';
const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';

function businessRuleErrors(config: CustomizationConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // ── Network validation ────────────────────────────────────────────────────

    const networkValidation = validateNetworkSelection(config.stellar.network);
    if (!networkValidation.valid && networkValidation.error) {
        errors.push({
            field: networkValidation.error.field,
            message: networkValidation.error.message,
            code: networkValidation.error.code,
        });
        // Don't continue if network is invalid
        // (other validations require valid network to make sense)
        return errors;
    }

    // ── Horizon URL and network consistency ────────────────────────────────────

    const { network, horizonUrl } = config.stellar;

    if (network === 'mainnet' && horizonUrl === TESTNET_HORIZON) {
        errors.push({
            field: 'stellar.horizonUrl',
            message: 'Horizon URL points to testnet but network is set to mainnet',
            code: 'HORIZON_NETWORK_MISMATCH',
        });
    }

    if (network === 'testnet' && horizonUrl === MAINNET_HORIZON) {
        errors.push({
            field: 'stellar.horizonUrl',
            message: 'Horizon URL points to mainnet but network is set to testnet',
            code: 'HORIZON_NETWORK_MISMATCH',
        });
    }

    // ── Branding validation ────────────────────────────────────────────────────

    if (config.branding.primaryColor === config.branding.secondaryColor) {
        errors.push({
            field: 'branding.secondaryColor',
            message: 'Secondary color must differ from primary color',
            code: 'DUPLICATE_COLORS',
        });
    }

    return errors;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validate a customization config payload.
 * Returns a stable ValidationResult with field-level errors.
 * Safe to call from both API routes and internal services.
 *
 * Network validation is performed by StellarNetworkService to provide
 * detailed, actionable error messages for unsupported or invalid networks.
 */
export function validateCustomizationConfig(input: unknown): ValidationResult {
    const parsed = customizationConfigSchema.safeParse(input);

    if (!parsed.success) {
        const errors: ValidationError[] = parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code.toUpperCase(),
        }));
        return { valid: false, errors };
    }

    // Type-cast parsed data for business rule validation
    // (safe because schema validation passed all required checks)
    const config = parsed.data as unknown as CustomizationConfig;

    const businessErrors = businessRuleErrors(config);
    if (businessErrors.length > 0) {
        return { valid: false, errors: businessErrors };
    }

    return { valid: true, errors: [] };
}
