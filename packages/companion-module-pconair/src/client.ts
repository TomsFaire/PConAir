import WebSocket from 'ws'

export interface PcoState {
  currentMode: string
  currentUrl: string | null
  currentPreset: { id: string; name: string } | null
  slides: {
    deckId: string
    deckTitle: string
    slideIndex: number // 0-based
    slideCount: number
    isLoading: boolean
  } | null
  l3: {
    activeCueId: string | null
    activeCueName: string | null
    activeTitle: string | null
    isStacking: boolean
  } | null
  abState: {
    activeInstance: 'A' | 'B'
  }
  connectionStatus: {
    webSocketClients: number
    companionConnected: boolean
  }
}

export type StateUpdateCallback = (state: Partial<PcoState>) => void
export type ConnectionCallback = (connected: boolean) => void

export interface ClientConfig {
  host: string
  port: number
  operatorPin: string
  pollingIntervalMs: number
  onStateUpdate: StateUpdateCallback
  onConnectionChange: ConnectionCallback
  log: (level: 'debug' | 'info' | 'warn' | 'error', msg: string) => void
}

export class PcoClient {
  private config: ClientConfig
  private ws: WebSocket | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectDelay = 1000
  private sessionCookie: string | null = null
  private usingHttpFallback = false
  private destroyed = false
  private wsConnected = false

  constructor(config: ClientConfig) {
    this.config = config
  }

  start(): void {
    this.destroyed = false
    this.connectWs()
  }

  destroy(): void {
    this.destroyed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.ws) {
      this.ws.terminate()
      this.ws = null
    }
  }

  // Send an action via WebSocket (preferred) or HTTP (fallback)
  async sendAction(actionId: string, params: Record<string, unknown>): Promise<void> {
    if (this.wsConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'action',
          action_id: actionId,
          params,
          pin: this.config.operatorPin,
        })
      )
    } else {
      await this.httpAction(actionId, params)
    }
  }

  private wsUrl(): string {
    return `ws://${this.config.host}:${this.config.port}/ws?companion=1`
  }

  private httpBase(): string {
    return `http://${this.config.host}:${this.config.port}`
  }

  private connectWs(): void {
    if (this.destroyed) return
    try {
      const ws = new WebSocket(this.wsUrl())
      this.ws = ws

      ws.on('open', () => {
        this.reconnectDelay = 1000
        this.wsConnected = true
        this.usingHttpFallback = false
        if (this.pollTimer) {
          clearInterval(this.pollTimer)
          this.pollTimer = null
        }
        this.config.onConnectionChange(true)
        this.config.log('info', `Connected to PC On Air at ${this.config.host}:${this.config.port}`)
      })

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type: string; payload?: unknown }
          if (msg.type === 'state' && msg.payload) {
            this.config.onStateUpdate(msg.payload as Partial<PcoState>)
          } else if (msg.type === 'state_patch' && msg.payload) {
            this.config.onStateUpdate(msg.payload as Partial<PcoState>)
          }
        } catch {
          /* ignore malformed */
        }
      })

      ws.on('close', () => {
        this.wsConnected = false
        this.ws = null
        if (!this.destroyed) {
          this.config.onConnectionChange(false)
          this.config.log('warn', `WebSocket closed; trying HTTP fallback then reconnecting`)
          this.startHttpFallback()
          this.scheduleReconnect()
        }
      })

      ws.on('error', (err: Error) => {
        this.config.log('warn', `WebSocket error: ${err.message}`)
        // close event will fire after error
      })
    } catch (err) {
      this.config.log('error', `Failed to create WebSocket: ${String(err)}`)
      this.startHttpFallback()
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.destroyed && !this.wsConnected) {
        this.connectWs()
      }
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
  }

  private startHttpFallback(): void {
    if (this.pollTimer) return
    this.usingHttpFallback = true
    this.pollTimer = setInterval(() => {
      void this.httpPoll()
    }, this.config.pollingIntervalMs)
    void this.httpPoll() // poll immediately
  }

  private async httpPoll(): Promise<void> {
    if (this.wsConnected) {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      return
    }
    try {
      await this.ensureSession()
      const res = await fetch(`${this.httpBase()}/api/status`, {
        headers: this.sessionCookie ? { Cookie: this.sessionCookie } : {},
      })
      if (res.ok) {
        const state = (await res.json()) as Partial<PcoState>
        this.config.onConnectionChange(true)
        this.config.onStateUpdate(state)
      }
    } catch {
      /* network error; keep trying */
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionCookie) return
    if (!this.config.operatorPin) return
    try {
      const res = await fetch(`${this.httpBase()}/auth/operator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: this.config.operatorPin }),
      })
      const setCookie = res.headers.get('set-cookie')
      if (setCookie) this.sessionCookie = setCookie.split(';')[0]
    } catch {
      /* ignore */
    }
  }

  private async httpAction(actionId: string, params: Record<string, unknown>): Promise<void> {
    try {
      await this.ensureSession()
      await fetch(`${this.httpBase()}/api/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.sessionCookie ? { Cookie: this.sessionCookie } : {}),
        },
        body: JSON.stringify({ action_id: actionId, params }),
      })
    } catch (err) {
      this.config.log('warn', `HTTP action failed: ${String(err)}`)
    }
  }
}
