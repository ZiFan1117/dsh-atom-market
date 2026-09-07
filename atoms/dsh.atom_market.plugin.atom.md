---
id: dsh.atom_market.plugin
layer: capability
version: 0.1.0
intent: "把逛/读/验/稿四个商店动作注册进 DSH：分装成可对话的商店插件（框架原子）"
when_to_use: "把软件原子市场装进 dsh，Agent 可逛/读/验/稿"
language: zh-CN
tags: ["plugin", "dsh", "atom", "market"]
category: ai
side_effects: none
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: "dsh-atom-market src/index.ts（注册 atom_search/atom_read/atom_validate/atom_draft）"
deps: ["atom.gate.validate", "atom.registry.search", "store.read_index", "store.read_atom", "atom.draft", "github.fetch_file"]
input: {"type":"object","properties":{"ctx":{"type":"object","description":"dsh host context（tools 注入）"},"env":{"type":"object","description":"DSH_ATOM_STORE_* / token"}}}
output: {"type":"object","properties":{"tools":{"type":"array","description":"已注册工具名"}}}
---

## 它做什么

把逛/读/验/稿四个商店动作注册进 DSH：分装成可对话的商店插件（框架原子）。确定性编排：不调 LLM、可重复可测试。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
CTX[ctx(tools)] --> R[注册 atom_search]
CTX --> R2[注册 atom_read]
CTX --> R3[注册 atom_validate]
CTX --> R4[注册 atom_draft]
R --> SE[registry.search]
R2 --> RA[store.read_atom]
R3 --> VA[atom.gate.validate]
R4 --> DR[atom.draft]
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class Plugin { +apply(ctx) }
Plugin --> Searcher
Plugin --> IndexLoader
Plugin --> AtomReader
Plugin --> Validator
Plugin --> DraftAtom
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
participant U as Agent
participant P as dsh.atom_market.plugin
participant T as 商店原子
U->>P: atom_search(意图)
P->>T: search
U->>P: atom_read(id)
P->>T: read_atom 回源
U->>P: atom_validate(manifest)
P->>T: validate
```

**4) 调用图（graph）**
```mermaid
graph TD
apply --> regTools
regTools --> indexStore
regTools --> reader
regTools --> gate
reader --> parse
```

## 何时用

- 适用：把软件原子市场装进 dsh，Agent 可逛/读/验/稿。
- 不适用：不是原子库本身（原子由商店收录）。

## 示例

在 dsh 内 `dsh plugin add github:ZiFan1117/dsh-atom-market` → 会话可直接用 atom_search/atom_read/atom_validate/atom_draft。
