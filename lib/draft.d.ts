export interface DraftOptions {
    intent: string;
    id?: string;
    layer?: string;
    category?: string;
    side_effects?: string;
    tags?: string[];
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    lang?: string;
    author?: string;
    implementation_ref?: string;
}
export interface DraftResult {
    draft: Record<string, unknown>;
    notes: string[];
}
export declare function draftAtom(opts: DraftOptions): DraftResult;
