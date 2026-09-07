---
id: store.read_index
layer: capability
version: 0.1.0
intent: "拉取并缓存 registry/index.json 指针集（或本地 DSH_ATOM_STORE_DIR atoms 目录）"
when_to_use: "适用：atom_search/atom_read 先取商店指针集。"
language: zh-CN
tags: ["store","registry","index","pointers"]
category: data
side_effects: network
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: "dsh-atom-market src/store.ts (openStore/loadIndex，5min 缓存)"
deps: ["github.fetch_file"]
input: {"type":"object","properties":{"owner":{"type":"string"},"repo":{"type":"string"},"branch":{"type":"string"},"store_dir":{"type":"string"},"token":{"type":"string"}}}
output: {"type":"object","properties":{"ok":{"type":"boolean"},"records":{"type":"array","items":{"type":"object"}},"error":{"type":"string"}}}
---

## 它做什么

拉取并缓存 registry/index.json 指针集（或本地 DSH_ATOM_STORE_DIR atoms 目录）。确定性实现：不调用 LLM、可重复可测试。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
ENV[owner/repo/branch 或 store_dir] --> L{本地目录?}
L -- 否 --> F[github.fetch_file registry/index.json]
F --> P[JSON 解析指针]
P --> C[cache TTL 5min]
C --> OUT[records]
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class IndexLoader { +load(env) }
IndexLoader : cache(5min)
IndexLoader --> GitHubFile
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
U->>I: load()
I->>I: cache 命中?
I-->>U: AtomRecord[]
```

**4) 调用图（graph）**
```mermaid
graph TD
load --> remote
remote --> fetchFile
remote --> parseJson
local --> readDir
```

## 何时用

- 适用：atom_search/atom_read 先取商店指针集。
- 不适用：不回源拉详情（那是 store.read_atom）。

## 示例

输入 {}（默认 ZiFan1117/software-atom-market@main）→ { ok:true, records:[{id,intent,layer,…}×N] }。
