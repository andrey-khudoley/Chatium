app.get('/').handle(async (ctx, req) => {
  return {
    success: true,
    result: "Hi, " + (ctx.user?.firstName || "Unknown user") + "!"
  }
})
