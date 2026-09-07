---
id: atom.gate.parse
layer: primitive
version: 0.1.0
intent: 解析原子文档：YAML frontmatter + 正文（或 legacy JSON manifest）→ meta + body
when_to_use: 投稿/读取前把 <id>.atom.md（或旧 .atom.json）拆成元数据与正文本体
language: zh-CN
tags: ["atom", "parse", "manifest", "frontmatter"]
category: code
side_effects: none
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: software-atom-market scripts/validate-lib.mjs (parseAtomDocument)
deps: []
input: {"type":"object","required":["text"],"properties":{"text":{"type":"string","description":"atom 文档原文（--- frontmatter + 正文）或 legacy JSON manifest"}}}
output: {"type":"object","required":["ok"],"properties":{"ok":{"type":"boolean"},"meta":{"type":"object"},"body":{"type":"string"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}
---

## 它做什么

把一份原子文档解析成两段：frontmatter（YAML 键值 = manifest 字段，`description` 除外）与 frontmatter 之后的 Markdown 正文（= description）。v0.2 的 JSON manifest 也被兼容处理。确定性纯函数，不调 LLM、不联网。

## 怎么实现

**1) 数据流转（flowchart：一份输入怎么变成 meta+body）**
```mermaid
flowchart LR
T[text] --> C{以 --- 开头?}
C -- 是 --> F[frontmatter 键值解析<br/>数组/对象 JSON 内联]
F --> BODY[取 --- 后正文]
C -- 否(JSON) --> J[JSON.parse 兼容]
BODY --> OUT[meta + body + errors/warnings]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class DocParser { +parse(text): {meta, body, errors} }
DocParser : frontmatter 行解析 key: value
DocParser : JSON 内联值 / 标量 / 引号
DocParser : 未闭合 frontmatter 报错
```

**3) 交互时序（sequenceDiagram：调用方与本原子怎么协作）**
```mermaid
sequenceDiagram
participant U as validate/read_atom
participant P as atom.gate.parse
U->>P: parse(docText)
P-->>U: {ok, meta, body, errors, warnings}
U->>P: parse(jsonText)
P-->>U: meta（legacy 兼容）
```

**4) 调用图（graph：本原子及内部调用关系）**
```mermaid
graph TD
parse --> detectKind
detectKind --> splitFrontmatter
splitFrontmatter --> parseLine
splitFrontmatter --> jsonFallback
```

## 何时用

- 适用：atom_read 回源读文档后先解析；validate/目录生成/联邦发现的预处理。
- 不适用：不做语义校验（那是 atom.gate.validate）；不改写正文内容。

## 示例

输入 { text: "---\nid: a.b\nintent: 做X\n---\n\n## 它做什么\n…" } → 输出 { ok: true, meta: { id: "a.b", intent: "做X" }, body: "## 它做什么\n…" }。
