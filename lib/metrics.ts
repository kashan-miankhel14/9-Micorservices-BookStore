import client from "prom-client"

declare global {
  // eslint-disable-next-line no-var
  var __PROM_REGISTER__: client.Registry | undefined
}

export function getMetricsRegister(): client.Registry {
  if (!global.__PROM_REGISTER__) {
    const register = new client.Registry()
    client.collectDefaultMetrics({ register })
    global.__PROM_REGISTER__ = register
  }
  return global.__PROM_REGISTER__
}
