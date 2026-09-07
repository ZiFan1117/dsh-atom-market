---
id: store.read_atom
layer: capability
version: 0.1.0
intent: "按指针回源读 manifest/atom 文档并解析（.atom.md 与旧 .atom.json 均支持）"
when_to_use: "适用：atom_read 命中后给完整详情。"
language: zh-CN
tags: ["store","atom","read","fetch"]
category: data
side_effects: network
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: "dsh-atom-market src/store.ts (fetchRecordManifest) + atom.gate.parse 解析"
deps: ["github.fetch_file","atom.gate.parse"]
input: {"type":"object","required":["repo","path"],"properties":{"repo":{"type":"string"},"path":{"type":"string"},"token":{"type":"string"}}}
output: {"type":"object","properties":{"ok":{"type":"boolean"},"id":{"type":"string"},"meta":{"type":"object"},"description":{"type":"string"},"error":{"type":"string"}}}
---

## 它做什么

按指针回源读 manifest/atom 文档并解析（.atom.md 与旧 .atom.json 均支持）。确定性实现：不调用 LLM、可重复可测试。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
P[repo+path] --> F[github.fetch_file]
F --> KIND{.atom.md?}
KIND -- 是 --> PR[atom.gate.parse → meta+body]
KIND -- 否(JSON) --> JP[JSON.parse manifest]
PR --> OUT[meta + description(body)]
JP --> OUT
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class AtomReader { +read(pointer) }
AtomReader --> GitHubFile
AtomReader --> DocParser
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
U->>R: read({repo, path})
R->>R: 拉取+解析
R-->>U: {id, meta, description}
```

**4) 调用图（graph）**
```mermaid
graph TD
read --> fetch
read --> detectKind
detectKind --> parseDoc
detectKind --> parseJson
```

## 何时用

- 适用：atom_read 命中后给完整详情。
- 不适用：不做索引检索（那是 store.read_index/atom.registry.search）。

## 示例

输入 { repo:"ZiFan1117/bazidiy", path:"atoms/bazidiy.propose_designs.atom.md" } → { ok:true, id:"…", meta:{…}, description:"## 它做什么…" }。
