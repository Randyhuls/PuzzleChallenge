
import { AssetManager, StateManager, gin } from 'gin/dist/src/core'
import { Display, Input } from 'gin/dist/src/io'
import { AssetType } from 'gin/dist/src/core/types'
import { KeyboardSchema } from './types'
import { Images, getImageDir } from './assets'
import { getAppName, getVersion } from './utils'
import Game from './game'

const { useState } = StateManager
const input = Input.shared

export const [getAssets, setAssets] = useState<AssetType[]>([])

// Start engine
gin({}, async () => {
  console.log(`Running '${getAppName()}:v${getVersion()}'`)

  // Preload assets
  setAssets(
    await (async () => {
      return AssetManager.manager.preloadMultiple(Object.entries(Images).map(([key, value]) => { 
        const img: HTMLImageElement = new Image()
        img.src = getImageDir(value)
        return { id: key, asset: img }
      }))
    })()
  )

  // Create display
  Display.create({ 
    canvas: document.querySelector('main[role="app"] canvas')!,
    screenWidth: 384,
    screenHeight: 512
  })

  // Set up input
  input.setSchema(KeyboardSchema).listen()

  // Start game mechanics
  const game = new Game()
})