export interface AtomPublicFields {
    id: string;
    intent: string;
    layer: string;
    category?: string;
    side_effects?: string;
    version: string;
    verified?: boolean;
    tags?: string[];
}
export interface AtomRecord extends AtomPublicFields {
    file: string;
    manifest: Record<string, unknown>;
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
export declare function isStoreRoot(dir: string): boolean;
export declare function findStoreRoot(start?: string): string | null;
export declare function readAtoms(root: string): AtomRecord[];
export declare function openStore(env?: StoreEnv): {
    load: () => Promise<LoadResult>;
};
export interface ListOptions {
    query?: string;
    layer?: string;
    verified?: boolean;
    limit?: number;
}
export declare function searchAtoms(records: AtomRecord[], opts: ListOptions): AtomPublicFields[];
export declare function readAtom(records: AtomRecord[], id: string): AtomRecord | undefined;
