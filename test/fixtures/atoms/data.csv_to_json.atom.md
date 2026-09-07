---
id: data.csv_to_json
layer: capability
version: 1.0.0
intent: "把 CSV 文本转成 JSON 数组"
when_to_use: "文本层完整的 CSV（含/不含表头、自定义分隔符）。"
language: zh-CN
tags: ["csv","json","parse"]
category: data
side_effects: none
lang: python
author: example
verified: false
implementation_ref: "example: python package; runner 尚未实现"
input: {"type":"object","required":["csv_text"],"properties":{"csv_text":{"type":"string","description":"CSV 原始文本（含或不含表头）"},"has_header":{"type":"boolean","description":"首行是否为表头","default":true},"delimiter":{"type":"string","description":"分隔符","default":","}}}
output: {"type":"array","items":{"type":"object","description":"一行 CSV = 一个对象（has_header=false 时键为 col_0, col_1, ...）"}}
tests: [{"input":{"csv_text":"name,age\nalice,30\nbob,25","has_header":true},"expect":[{"name":"alice","age":"30"},{"name":"bob","age":"25"}]}]
---
## 它做什么

把 CSV 原始文本按分隔符解析，转成 JSON 对象数组：有表头则以表头为键，无表头则输出 col_0, col_1 键。

## 怎么实现

数据流转：
```mermaid
flowchart LR
  A[CSV text] --> B[逐行切分] --> C[列对齐/表头映射] --> D[JSON 数组]
```

模块分解：
```mermaid
classDiagram
  class Parser { parse() }
  class RowMapper { map(header,row) }
  Parser --> RowMapper
```

交互时序：
```mermaid
sequenceDiagram
  participant U as 用户/上游
  participant A as data.csv_to_json
  U->>A: csv_text + has_header
  A-->>U: JSON 数组
```

调用图：
```mermaid
graph TD
  parse --> splitRows
  parse --> mapRow
  mapRow --> normalizeKeys
```

## 何时用 / 何时不用

- 适用：文本层完整的 CSV（含/不含表头、自定义分隔符）。
- 不适用：超大文件请先切片；单元格内嵌分隔符需先选不冲突的 delimiter。

## 示例

输入：`name,age\nalice,30\nbob,25` → 输出：`[{name:alice,age:30},{name:bob,age:25}]`
