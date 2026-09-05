export interface ValidateResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare function validateManifestObject(m: unknown, context?: string): ValidateResult;
export declare function validateManifestText(text: string): ValidateResult;
