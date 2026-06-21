import { BrokerSemanticError } from './errorCodes.lib'

const ALLOWED_SCHEMA_KEYS = new Set([
  'type',
  'required',
  'properties',
  'items',
  'additionalProperties',
  'enum',
  'const'
])

type Schema = Record<string, unknown>

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (Number.isInteger(value)) return 'integer'
  return typeof value
}

export function validateJsonSchemaSubset(schema: unknown, path = 'schema'): void {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    throw new BrokerSemanticError('invalid_contract_schema', 'Schema must be an object', { path })
  }
  const obj = schema as Schema
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_SCHEMA_KEYS.has(key)) {
      throw new BrokerSemanticError('invalid_contract_schema', 'Unsupported schema keyword', {
        path,
        key
      })
    }
  }
  const type = obj.type
  const allowedTypes = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']
  if (typeof type !== 'string' || !allowedTypes.includes(type)) {
    throw new BrokerSemanticError('invalid_contract_schema', 'Schema type is required', { path })
  }
  if (obj.required !== undefined) {
    if (!Array.isArray(obj.required) || obj.required.some((item) => typeof item !== 'string')) {
      throw new BrokerSemanticError(
        'invalid_contract_schema',
        'Schema required must be string array',
        {
          path
        }
      )
    }
  }
  if (obj.properties !== undefined) {
    if (
      typeof obj.properties !== 'object' ||
      obj.properties === null ||
      Array.isArray(obj.properties)
    ) {
      throw new BrokerSemanticError('invalid_contract_schema', 'Schema properties must be object', {
        path
      })
    }
    for (const [key, child] of Object.entries(obj.properties as Record<string, unknown>)) {
      validateJsonSchemaSubset(child, `${path}.properties.${key}`)
    }
  }
  if (obj.items !== undefined) validateJsonSchemaSubset(obj.items, `${path}.items`)
}

function validatePayload(schema: Schema, value: unknown, path: string): string | null {
  const type = schema.type
  if (typeof type === 'string') {
    if (type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return `${path} must be number`
    } else if (type === 'integer') {
      if (!Number.isInteger(value)) return `${path} must be integer`
    } else if (typeOf(value) !== type) {
      return `${path} must be ${type}`
    }
  }
  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(value)) {
    return `${path} must equal const`
  }
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))
  ) {
    return `${path} must be in enum`
  }
  if (schema.type === 'object') {
    const obj = value as Record<string, unknown>
    const required = Array.isArray(schema.required) ? schema.required : []
    for (const key of required) {
      if (typeof key === 'string' && !(key in obj)) return `${path}.${key} is required`
    }
    const props = (schema.properties as Record<string, Schema> | undefined) ?? {}
    for (const [key, childSchema] of Object.entries(props)) {
      if (obj[key] !== undefined) {
        const error = validatePayload(childSchema, obj[key], `${path}.${key}`)
        if (error) return error
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) return `${path}.${key} is not allowed`
      }
    }
  }
  if (schema.type === 'array' && schema.items) {
    const arr = value as unknown[]
    for (let i = 0; i < arr.length; i++) {
      const error = validatePayload(schema.items as Schema, arr[i], `${path}.${i}`)
      if (error) return error
    }
  }
  return null
}

export function assertPayloadMatchesSchema(schema: unknown, payload: unknown): void {
  validateJsonSchemaSubset(schema)
  const error = validatePayload(schema as Schema, payload, 'payload')
  if (error) {
    throw new BrokerSemanticError('invalid_event_payload', error)
  }
}
