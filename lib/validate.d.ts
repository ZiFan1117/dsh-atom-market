export interface ValidateResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/** v0.3：整份 atom 文档 = YAML frontmatter（manifest 字段，description 除外）+ Markdown 正文（= description）。 */
export interface ParsedAtomDoc {
    valid: boolean;
    meta: Record<string, unknown>;
    body: string;
    errors: string[];
    warnings: string[];
}
export declare function parseAtomDocument(text: string): ParsedAtomDoc;
export declare function validateAtomDocumentText(text: string): ValidateResult;
/** v0.3 唯一格式：atom 文档（--- YAML frontmatter + 正文）。不再兼容旧 JSON manifest。 */
export declare function validateAtomText(text: string): ValidateResult;
export declare function validateManifestObject(m: unknown, context?: string): ValidateResult;
export declare function validateManifestText(text: string): ValidateResult;
