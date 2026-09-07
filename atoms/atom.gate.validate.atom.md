---
id: atom.gate.validate
layer: primitive
version: 0.1.0
intent: 机器闸校验原子：字段白名单/枚举/必填 + 正文四节四图硬检 → valid/errors/warnings
when_to_use: 投稿前自检、PR CI、插件 atom_validate
language: zh-CN
tags: ["atom", "validate", "gate", "machine-check"]
category: code
side_effects: none
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: software-atom-market scripts/validate-lib.mjs (validateManifestObject / validateAtomDocumentText)
deps: ["atom.gate.parse"]
input: {"type":"object","required":["text"],"properties":{"text":{"type":"string","description":"原子文档原文（.atom.md）或 legacy JSON manifest 文本"}}}
output: {"type":"object","required":["valid"],"properties":{"valid":{"type":"boolean"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}
---

## 它做什么

机器闸：对一个原子做**结构硬检**——顶层字段 ⊆ 白名单、`id/layer/version/intent/input/output` 必填、枚举合法；正文本体必须含四个 `##` 小节与四张 Mermaid 图（flowchart/classDiagram/sequenceDiagram/graph）。校验过 = 收录，无人工评审。确定性纯函数，不联网。

## 怎么实现

**1) 数据流转（flowchart：从文档到 valid/errors）**
```mermaid
flowchart LR
T[text] --> P[atom.gate.parse]
P --> F{字段检查}
F --> S{枚举/必填}
S --> D{正文四节四图}
D --> OUT[valid + errors + warnings]
```

**2) 模块分解（classDiagram：检查职责划分）**
```mermaid
classDiagram
class Validator { +validateDoc(text) +validateObject(m) }
Validator : checkFields(白名单/必填/枚举)
Validator : checkDescription(四节标题)
Validator : checkDiagrams(flowchart/classDiagram/sequenceDiagram/graph)
Validator --> Parser
```

**3) 交互时序（sequenceDiagram：调用方与本原子怎么协作）**
```mermaid
sequenceDiagram
participant U as CI / atom_validate
participant V as atom.gate.validate
U->>V: validate(text)
V->>V: parse → 字段 → 四节 → 四图
V-->>U: {valid, errors, warnings}
```

**4) 调用图（graph：检查内部关系）**
```mermaid
graph TD
validateDoc --> parse
validateDoc --> checkFields
validateDoc --> checkDescription
checkDescription --> checkDiagrams
```

## 何时用

- 适用：投稿自检、软件原子市场 PR CI、dsh-atom-market 的 atom_validate、联邦发现器的逐文件闸门。
- 不适用：不判断图与实现的"真实性"（由作者署名负责，使用反馈淘汰）。

## 示例

输入 { text: "<atom.md 全文>" } → 输出 { valid: true, errors: [], warnings: [] }；缺 `## 示例` 时 → { valid: false, errors: ["缺少章节 示例"] }。
