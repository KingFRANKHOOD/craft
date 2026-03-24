import type { CustomizationConfig, PreviewPayload, StellarMockData, TemplateCategory, DeepPartial } from '@craft/types';
import { mockStellarGenerator } from '@/lib/preview/mock-stellar-generator';

/**
 * PreviewService
 * 
 * Converts customization state into a renderable preview payload.
 * Generates deterministic mock Stellar data for iframe preview rendering.
 */
export class PreviewService {
    private templateCategory?: TemplateCategory;

    /**
     * Set template category for context-specific mock data generation.
     */
    setTemplateCategory(category?: TemplateCategory): void {
        this.templateCategory = category;
    }

    /**
     * Generate a preview payload from customization config.
     * Returns a deterministic payload with mock Stellar context.
     */
    generatePreview(customization: CustomizationConfig): PreviewPayload {
        const mockData = this.generateMockData(customization);

        return {
            customization,
            mockData,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Update preview with partial customization changes.
     * Detects changed fields and only regenerates mock data if network config changed.
     * Returns minimal update payload for efficient iframe updates.
     */
    updatePreview(
        currentCustomization: CustomizationConfig,
        changes: DeepPartial<CustomizationConfig>
    ): { customization: CustomizationConfig; mockData?: StellarMockData; changedFields: string[]; timestamp: string } {
        const updatedCustomization = this.mergeCustomization(currentCustomization, changes);
        const changedFields = this.detectChangedFields(currentCustomization, changes);
        const requiresMockDataRefresh = this.requiresMockDataRefresh(changedFields);

        const payload: any = {
            customization: updatedCustomization,
            changedFields,
            timestamp: new Date().toISOString(),
        };

        if (requiresMockDataRefresh) {
            payload.mockData = this.generateMockData(updatedCustomization);
        }

        return payload;
    }

    /**
     * Deep merge partial changes into current customization.
     */
    private mergeCustomization(
        current: CustomizationConfig,
        changes: DeepPartial<CustomizationConfig>
    ): CustomizationConfig {
        return {
            branding: { ...current.branding, ...(changes.branding ?? {}) },
            features: { ...current.features, ...(changes.features ?? {}) },
            stellar: { ...current.stellar, ...(changes.stellar ?? {}) },
        };
    }

    /**
     * Detect which fields changed by comparing current and changes.
     * Returns array of dot-notation field paths (e.g., "branding.appName").
     */
    private detectChangedFields(
        current: CustomizationConfig,
        changes: DeepPartial<CustomizationConfig>
    ): string[] {
        const fields: string[] = [];

        if (changes.branding) {
            Object.keys(changes.branding).forEach((key) => {
                const currentVal = (current.branding as any)[key];
                const changeVal = (changes.branding as any)[key];
                if (currentVal !== changeVal) {
                    fields.push(`branding.${key}`);
                }
            });
        }

        if (changes.features) {
            Object.keys(changes.features).forEach((key) => {
                const currentVal = (current.features as any)[key];
                const changeVal = (changes.features as any)[key];
                if (currentVal !== changeVal) {
                    fields.push(`features.${key}`);
                }
            });
        }

        if (changes.stellar) {
            Object.keys(changes.stellar).forEach((key) => {
                const currentVal = (current.stellar as any)[key];
                const changeVal = (changes.stellar as any)[key];
                if (currentVal !== changeVal) {
                    fields.push(`stellar.${key}`);
                }
            });
        }

        return fields;
    }

    /**
     * Determine if mock data needs to be regenerated.
     * Only network changes require mock data refresh.
     */
    private requiresMockDataRefresh(changedFields: string[]): boolean {
        return changedFields.some((field) => field.startsWith('stellar.network'));
    }

    /**
     * Generate deterministic mock Stellar data using the generator.
     * Delegates to MockStellarGenerator for template-specific data.
     */
    private generateMockData(config: CustomizationConfig): StellarMockData {
        return mockStellarGenerator.generateMockData(config.stellar.network, this.templateCategory);
    }
}

export const previewService = new PreviewService();
