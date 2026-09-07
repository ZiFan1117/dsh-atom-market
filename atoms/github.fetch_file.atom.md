---
id: github.fetch_file
layer: capability
version: 0.1.0
intent: "从 GitHub contents API 读取仓库某文件原文（base64 解码为 UTF-8）"
when_to_use: "适用：回源读 manifest/atom 文档、registry 索引。"
language: zh-CN
tags: ["github","fetch","contents","raw"]
category: code
side_effects: network
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: "dsh-atom-market src/store.ts (fetchJson + base64 decode)"
deps: []
input: {"type":"object","required":["owner","repo","path"],"properties":{"owner":{"type":"string"},"repo":{"type":"string"},"path":{"type":"string"},"ref":{"type":"string"},"token":{"type":"string"}}}
output: {"type":"object","properties":{"ok":{"type":"boolean"},"content":{"type":"string"},"error":{"type":"string"}}}
---

## 它做什么

从 GitHub contents API 读取仓库某文件原文（base64 解码为 UTF-8）。确定性实现：不调用 LLM、可重复可测试。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
P[owner/repo/path/ref] --> G[GET contents api]
G --> D[base64 decode]
D --> OUT[content]
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class GitHubFile { +fetch(owner, repo, path, ref) }
GitHubFile : auth header(Bearer)
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
U->>G: fetch(owner,repo,atoms/x.atom.md, main)
G-->>U: 原文 utf8
```

**4) 调用图（graph）**
```mermaid
graph TD
fetch --> request
request --> decode
fetch --> handleError
```

## 何时用

- 适用：回源读 manifest/atom 文档、registry 索引。
- 不适用：写/改文件（只读）。

## 示例

输入 { owner:"ZiFan1117", repo:"software-atom-market", path:"registry/index.json", ref:"main" } → { ok:true, content:"{…}" }。
