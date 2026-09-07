export interface IndexAtom {
    repo: string;
    path: string;
    id: string;
    intent: string;
    layer: string;
    category?: string;
    side_effects?: string;
    version: string;
    verified: boolean;
    updated_at?: string;
    tags?: string[];
    when_to_use?: string;
}
export interface AtomRecord extends IndexAtom {
    tier: 'verified' | 'community';
}
export interface LoadResult {
    records: AtomRecord[];
    error?: string;
}
export interface StoreEnv {
    DSH_ATOM_STORE_DIR?: string;
    DSH_ATOM_STORE_OWNER?: string;
    DSH_ATOM_STORE_REPO?: string;
    DSH_ATOM_STORE_BRANCH?: string;
    GITHUB_PERSONAL_ACCESS_TOKEN?: string;
}
export declare const DEFAULT_OWNER = "ZiFan1117";
export declare const DEFAULT_REPO = "software-atom-market";
export declare const DEFAULT_BRANCH = "main";
export declare function readLocalDir(root: string): AtomRecord[];
export declare function openStore(env?: StoreEnv): {
    load: () => Promise<LoadResult>;
};
export declare function fetchRecordManifest(rec: AtomRecord, token?: string): Promise<{
    manifest?: Record<string, unknown>;
    error?: string;
}>;
export interface ListOptions {
    query?: string;
    layer?: string;
    category?: string;
    source?: 'verified' | 'community' | 'all';
    limit?: number;
}
export declare function searchAtoms(records: AtomRecord[], opts: ListOptions): AtomRecord[];
export declare function readAtom(records: AtomRecord[], id: string): AtomRecord | undefined;
