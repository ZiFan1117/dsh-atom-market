---
id: atom.registry.search
layer: primitive
version: 0.1.0
intent: "在原子指针集里按 query 检索 id+intent+tags+when_to_use（可过滤 layer/category/source）"
when_to_use: "适用：atom_search 返回指针级一句话命中。"
language: zh-CN
tags: ["atom","search","registry","retrieval"]
category: code
side_effects: none
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: "dsh-atom-market src/store.ts (searchAtoms / ListOptions)"
deps: []
input: {"type":"object","properties":{"query":{"type":"string"},"layer":{"type":"string","enum":["capability","primitive"]},"category":{"type":"string"},"source":{"type":"string","enum":["verified","community","all"]},"limit":{"type":"integer"}}}
output: {"type":"object","properties":{"items":{"type":"array","items":{"type":"object"}},"count":{"type":"integer"}}}
---

## 它做什么

在原子指针集里按 query 检索 id+intent+tags+when_to_use（可过滤 layer/category/source）。确定性实现：不调用 LLM、可重复可测试。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
R[records] --> Q[query/layer/category/source 过滤]
Q --> S[排序 id]
S --> OUT[items[]]
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class Searcher { +search(records, opts) }
Searcher : match(id+intent+tags+when)
Searcher : filter(layer/category/source)
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
U->>S: search(records, {query:"pdf"})
S-->>U: items(id/intent/tier/source)
```

**4) 调用图（graph）**
```mermaid
graph TD
search --> filter
filter --> haystack
search --> slice
```

## 何时用

- 适用：atom_search 返回指针级一句话命中。
- 不适用：不做语义/向量检索，不含详情。

## 示例

输入 { query:"PDF 抽表", limit:5 } → { items:[{id:"pdf.extract_tables", intent:"从 PDF 中抽出所有表格", tier:"verified", source:"…"}] }。
