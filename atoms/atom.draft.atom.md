---
id: atom.draft
layer: capability
version: 0.1.0
intent: "由一句意图生成 atom 文档骨架（含空四节正文占位）"
when_to_use: "适用：投稿快速起稿，再用 atom.gate.validate 自检。"
language: zh-CN
tags: ["atom","draft","scaffold"]
category: code
side_effects: none
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: "dsh-atom-market src/draft.ts (draftAtom)"
deps: []
input: {"type":"object","required":["intent"],"properties":{"intent":{"type":"string"},"id":{"type":"string"},"input":{"type":"object"},"output":{"type":"object"},"category":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}}}}
output: {"type":"object","properties":{"draft":{"type":"object"},"todo":{"type":"array","items":{"type":"string"}}}}
---

## 它做什么

由一句意图生成 atom 文档骨架（含空四节正文占位）。确定性实现：不调用 LLM、可重复可测试。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
IN[intent] --> S[slug id]
S --> M[frontmatter 骨架]
M --> B[四节正文占位]
B --> OUT[draft + 待补清单]
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class DraftAtom { +draft(opts) }
DraftAtom : slugify(intent)
DraftAtom : fourSectionPlaceholder()
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
U->>D: draft({intent:"换算币种"})
D-->>U: draft 文档 + 提示补 input/output/四图
```

**4) 调用图（graph）**
```mermaid
graph TD
draft --> slugify
draft --> fillFrontmatter
draft --> placeholders
```

## 何时用

- 适用：投稿快速起稿，再用 atom.gate.validate 自检。
- 不适用：成品需人工补正文四图与测试。

## 示例

输入 { intent:"把金额换算成目标币种" } → 输出 id:"contrib.amount_convert" 骨架 + 补齐清单。
