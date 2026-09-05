export interface ValidateResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const LAYERS = ['capability', 'primitive']
const SIDE_EFFECTS = ['none', 'network', 'file', 'email', 'db', 'process']
const ALLOWED_TOP_KEYS = new Set([
  'id', 'layer', 'version', 'intent', 'tags', 'input', 'output',
  'side_effects', 'lang', 'author', 'verified', 'implementation_ref', 'deps', 'tests',
])
const ID_RE = /^[a-z0-9]+(\.[a-z0-9_]+)+$/
const VER_RE = /^\d+\.\d+\.\d+$/

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function validateManifestObject(m: unknown, context = 'manifest'): ValidateResult {
  const errors: string[] = []
  const warnings: string[] = []
  const where = (k: string) => `${context}: ${k}`

  if (!isObj(m)) {
    return { valid: false, errors: [`${context}: 顶层必须是 JSON 对象`], warnings: [] }
  }

  for (const key of Object.keys(m)) {
    if (!ALLOWED_TOP_KEYS.has(key)) errors.push(`${where(key)}: 不在 spec 允许的顶层键内（additionalProperties=false）`)
  }

  const required = ['id', 'layer', 'version', 'intent', 'input', 'output']
  for (const key of required) {
    if (!(key in m)) errors.push(`${where(key)}: 缺少必填字段`)
  }

  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) {
    errors.push(`${where('id')}: 必须匹配 ^[a-z0-9]+(\\.[a-z0-9_]+)+$（如 pdf.extract_tables）`)
  }

  if (!LAYERS.includes(m.layer as string)) {
    errors.push(`${where('layer')}: 必须是 ${LAYERS.join(' / ')} 之一`)
  }

  if (typeof m.version !== 'string' || !VER_RE.test(m.version)) {
    errors.push(`${where('version')}: 必须匹配语义化版本 ^\\d+\\.\\d+\\.\\d+$`)
  }

  if (typeof m.intent !== 'string' || (m.intent as string).trim().length < 2) {
    errors.push(`${where('intent')}: 必须是一句≥2字的意图说明`)
  }

  for (const ioKey of ['input', 'output']) {
    const io = m[ioKey]
    if (!isObj(io) || Object.keys(io).length === 0) {
      errors.push(`${where(ioKey)}: 必须是非空对象（数据形状声明）`)
    } else if (!('$ref' in io) && typeof io.type !== 'string') {
      const hasShape = ['type', 'properties', 'items', 'enum', 'required', '$defs'].some((k) => k in io)
      if (!hasShape) warnings.push(`${where(ioKey)}: 看起来既无 type 也无结构字段，可能是过弱的数据声明`)
    }
  }

  if ('side_effects' in m && !SIDE_EFFECTS.includes(m.side_effects as string)) {
    errors.push(`${where('side_effects')}: 必须是 ${SIDE_EFFECTS.join(' / ')} 之一`)
  }

  if ('tags' in m && (!Array.isArray(m.tags) || (m.tags as unknown[]).some((t) => typeof t !== 'string'))) {
    errors.push(`${where('tags')}: 必须是字符串数组`)
  }

  if ('deps' in m && (!Array.isArray(m.deps) || (m.deps as unknown[]).some((d) => typeof d !== 'string'))) {
    errors.push(`${where('deps')}: 必须是字符串数组`)
  }

  for (const k of ['lang', 'author', 'implementation_ref'] as const) {
    if (k in m && typeof m[k] !== 'string') errors.push(`${where(k)}: 必须是字符串`)
  }

  if ('verified' in m && typeof m.verified !== 'boolean') {
    errors.push(`${where('verified')}: 必须是布尔值`)
  }

  if ('tests' in m && m.tests !== undefined) {
    if (!Array.isArray(m.tests)) {
      errors.push(`${where('tests')}: 必须是数组`)
    } else {
      ;(m.tests as unknown[]).forEach((t, i) => {
        if (!isObj(t) || !('input' in t) || !('expect' in t)) {
          errors.push(`${where(`tests[${i}]`)}: 每个测试必须有 input 与 expect`)
        }
      })
    }
  }

  if (m.verified === true) {
    if (!Array.isArray(m.tests) || m.tests.length === 0) {
      errors.push(`${where('verified')}: verified=true 必须有非空的 tests 契约样例`)
    }
  } else if (Array.isArray(m.tests) && m.tests.length === 0) {
    warnings.push(`${context}: tests 为空数组（等价未配），建议删除该字段`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateManifestText(text: string): ValidateResult {
  let m: unknown
  try {
    m = JSON.parse(text)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { valid: false, errors: [`manifest: JSON 解析失败（${message}）`], warnings: [] }
  }
  return validateManifestObject(m)
}
