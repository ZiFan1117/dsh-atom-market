---
id: pdf.extract_tables
layer: capability
version: 1.2.0
intent: "从 PDF 中抽出所有表格"
when_to_use: "报表、账单、论文数据表等文本层完整的版式化表格。"
language: zh-CN
tags: ["pdf","table","parse"]
category: document
side_effects: none
lang: python
author: example
verified: false
implementation_ref: "example: python package; runner 尚未实现"
input: {"type":"object","required":["pdf_bytes"],"properties":{"pdf_bytes":{"type":"string","contentEncoding":"base64","contentMediaType":"application/pdf","description":"PDF 文件字节（base64）"},"page_range":{"type":"array","items":{"type":"integer"},"description":"可选，只抽取这些页"}}}
output: {"type":"array","description":"每页每个表格一个对象","items":{"type":"object","required":["headers","rows"],"properties":{"page":{"type":"integer"},"headers":{"type":"array","items":{"type":"string"}},"rows":{"type":"array","items":{"type":"array","items":{"type":"string"}}}}}}
tests: [{"input":{"pdf_bytes":"<sample base64>"},"expect":{"type":"array","minItems":1}}]
---
## 它做什么

把 PDF 中版式规整的表格识别出来，输出为「表头 + 行」的结构化 JSON 数组；下游原子（换算/汇总/入库）可直接消费。

## 怎么实现

数据流转：
```mermaid
flowchart LR
  A[PDF 字节] --> B[候选表格区定位] --> C[单元格网格重建] --> D[rows/headers]
```

模块分解：
```mermaid
classDiagram
  class Locator { locate(page) }
  class GridBuilder { rebuild(region) }
  class Normalizer { flatten(cell) }
  Locator --> GridBuilder --> Normalizer
```

交互时序：
```mermaid
sequenceDiagram
  participant U as 用户/上游
  participant A as pdf.extract_tables
  U->>A: pdf_bytes + page_range
  A-->>U: 表格数组（无表返回空）
```

调用图：
```mermaid
graph TD
  extract --> walkPages
  walkPages --> locateRegions
  locateRegions --> rebuildGrid
  rebuildGrid --> emitRows
```

## 何时用 / 何时不用

- 适用：报表、账单、论文数据表等文本层完整的版式化表格。
- 不适用：扫描件/纯图片表格（无文本层，需先接 OCR 原子）；版式极乱的发票（结果需人工抽检）。

## 示例

输入：单页含一张两列表格的 PDF（表头 name,age）→ 输出：`[{headers:[name,age],rows:[[alice,30],[bob,25]],page:1}]`
