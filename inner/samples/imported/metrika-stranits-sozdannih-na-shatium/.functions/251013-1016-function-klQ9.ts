import { readdir } from '@app/fs'

async function main() {
  try {
    const files = await readdir(ctx, '/pu-v1-10')
    return { files }
  } catch (e) {
    return { error: e.message }
  }
}

app.function('/').handle(async (ctx) => {
  try {
    return {
      success: true,
      result: await main(ctx)
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message
    }
  }
})
