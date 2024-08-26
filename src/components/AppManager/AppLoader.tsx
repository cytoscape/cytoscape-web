const loadApps = async () => {
  try {
    const mod1 = await import('hello/HelloApp' as any)
    const { HelloApp } = mod1

    console.log('AppLoader rendered def', mod1, HelloApp)
  } catch (e) {
    console.error('Error loading HelloApp', e)
  }
}

loadApps()
