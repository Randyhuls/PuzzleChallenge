import { AssetManager, GameObject, Process, Scene, SceneManager, Vector2D } from 'gin/dist/src/core'
import { Input} from 'gin/dist/src/io'
import { GameState, KeyboardSchema, LayerType, Tile, TileState, TileType } from './types'

const input = Input.shared
const assetManager = AssetManager.manager
const sceneManager = SceneManager.shared

class Game extends Process {
  private THROTTLE_TO_FPS = 30
  private ROWS = 8
  private COLUMNS = 6
  private TILE_SIZE = 64

  public gameState: GameState = GameState.ACTIVE
  public scene: Scene = new Scene('DEMO_STAGE', this.ROWS*32, this.COLUMNS*32)
  public grid: Tile[][]
  
  public stageMovement = 16 // px
  public stageTicks = 0

  public selector: GameObject
  public selectorIndex: Vector2D = new Vector2D(2, 4) // Position in grid; 0,1 .. 1,1
  private defaultSelectorPosition: Vector2D = new Vector2D(this.selectorIndex.x * this.TILE_SIZE, this.selectorIndex.y * this.TILE_SIZE)

  constructor() {
    super()

    this.setUpStage() // Load the initial stage
    
    console.log('grid ->', this.grid)
    console.log('assets ->', assetManager.assets)
  }

  get selectedTile() {
    if (!this.grid) return null

    const { x, y } = this.selectorIndex
    return this.grid[y]![x] as Tile
  }

  private setUpStage(): void {
    // Create grid
    this.grid = Array.from(
      Array(this.ROWS).keys())
      .map((_, y: number) => Array.from(Array(this.COLUMNS).keys())
      .map((_, x: number) => new Tile({
        type: null, 
        state: null,
        //sprite: assetManager.getImageById('TILE_PURPLE') as HTMLImageElement,
        width: this.TILE_SIZE,
        height: this.TILE_SIZE,
        zIndex: LayerType.TILE,
        position: new Vector2D(x * this.TILE_SIZE, y * this.TILE_SIZE)
      }))
    )

    // Create selector
    this.selector = new GameObject({
      id: 'SELECTOR',
      width: this.TILE_SIZE * 2,
      height: this.TILE_SIZE,
      zIndex: LayerType.SELECTOR,
      position: this.defaultSelectorPosition,
      sprite: assetManager.getImageById('SELECTOR') as HTMLImageElement
    })
    
    // Add selector to scene
    this.scene.addObjectToScene(this.selector)
    
    // Fill the bottom four rows
    Array.from(Array(4).keys()).forEach((y: number) => this.spawnRow(this.ROWS - y - 1))
    
    sceneManager.addToQueue(this.scene).renderScene()
  }

  private getRandomTile(): TileType {
    const tileTypes: string[] = Object.values(TileType)
    return tileTypes[Math.floor(tileTypes.length * Math.random())]! as TileType 
  }

  private spawnRow(y: number = this.ROWS - 1): void {
    this.grid[y]!.forEach((tile: Tile, i: number) => {
      // Keep self invoking until we have a tile that does not match the last two in a row, both horizontally and vertically
      function getRandomTileType(){
        const type: TileType = (this as Game).getRandomTile()
        if (
          // Check horizontal previous two tiles
          (type === row?.[i - 1]?.type && type === row?.[i - 2]?.type) ||
          // Check vertical next two row tiles in same index position
          // Note: We check for next rows since we build the rows from the bottom up
          (type === this.grid?.[y + 1]?.[i]?.type && type === this.grid?.[y + 2]?.[i]?.type)
        ) return getRandomTileType.bind(this)()
        return type
      }

      const row = this.grid[y]
      let randomTileType: TileType = getRandomTileType.bind(this)()

      tile.state = TileState.DEFAULT
      tile.type = randomTileType
      tile.sprite = assetManager.getImageById(randomTileType) as HTMLImageElement

      this.scene.setObjectById(tile.id, tile) // Add to stage (creates a reference to grid item)
    })
  }

  private destroyRow(y: number = 0): void {
    this.grid[y]?.forEach(({ id }) => this.scene.destroyObjectById(id)) // Delete each tile in the row from the scene
    this.grid.splice(y, 1) // Delete the corresponding grid row
  }

  private onSelectorMove(): void {
    const { x, y } = this.selectorIndex

    if (input.getDirectionX().equals(Vector2D.ZERO) && input.getDirectionY().equals(Vector2D.ZERO)) return // Only evaluate when moving

    if (Object.values(input.keys).filter(key => key).length > 1) return // Can only press one key at a time

    const maxX = new Vector2D(this.COLUMNS - 2, 0) // -2 due to 1x2 selector
    const maxY = new Vector2D(0, this.ROWS - 1)

    const updatedX = new Vector2D(x + input.getDirectionX().x, 0).clamp(Vector2D.ZERO, maxX).x
    const updatedY = new Vector2D(0, y + input.getDirectionY().y).clamp(Vector2D.ZERO, maxY).y

    this.selectorIndex.set(updatedX, updatedY)
    this.selector.position.x = updatedX * this.TILE_SIZE
    this.selector.position.y = (updatedY * this.TILE_SIZE) - (this.stageMovement * this.stageTicks)
  }

  private onTileSwap(): void {
    const schema = input.getSchema<typeof KeyboardSchema>()
    if (input.isPressed(schema.SWAP)) this.swapTiles()
  }

  private onMoveStage(): void {
    const tiles = this.grid.flat()

    tiles.forEach((tile: GameObject) => { tile.position.y -= this.stageMovement }) // Move each tile
    this.selector.position.y -= this.stageMovement // Move selector

    // Find the first row that has a tile with a y position lower than zero
    if (tiles.find((tile: Tile) => tile.isActive && tile.position.y <= 0)) {
      this.gameState = GameState.GAME_OVER
      console.log('GAME OVER')
      return
      // TODO: 
      // 1. Turn all remaining tiles to stone
      // 2. Show defeat screen
    }

    // If top row has reached a full tile beyond top boundary, pop it and spawn a new row
    if (this.grid[0]![0]!.position.y <= -this.TILE_SIZE) {
      console.log('refresh now!')

      this.destroyRow(0) // Pop top row

      const y = this.ROWS - 1 // last row index

      // Push new row of empty tiles to the bottom
      const row = Array.from(Array(this.COLUMNS).keys()).map((_, x: number) => new Tile({
        type: null, 
        state: null,
        width: this.TILE_SIZE,
        height: this.TILE_SIZE,
        zIndex: LayerType.TILE,
        position: new Vector2D(x * this.TILE_SIZE, this.grid[y - 1]![x]!.position.y + this.TILE_SIZE)
      }))

      this.grid.push(row)
      
      this.spawnRow(y)
    }
  }

  // private setTileState(pos: Position, state: TileState | null): void {
  //   if (!this.grid) return
  //   const tile = this.grid[pos.y]![pos.x]
  //   tile!.state = state
  //   this.scene.setObjectById(tile!.id, tile!)
  // }

  private swapTiles(x: number = this.selectorIndex.x, y: number = this.selectorIndex.y) {
    const x0 = this.grid[y]![x] as Tile
    const x0Id = x0.id
    const x0Pos = x0.position

    const x1 = this.grid[y]![x + 1] as Tile
    const x1Id = x1.id
    const x1Pos = x1.position

    // Swap positions of x0 and x1 tiles
    x0.id = x1Id
    x0.position = x1Pos
    this.grid[y]![x] = x1

    x1.id = x0Id
    x1.position = x0Pos
    this.grid[y]![x + 1] = x0
  }

  protected onUpdate?(delta: number, fps: number): void {
    if (this.gameState === GameState.GAME_OVER) return

    // Player actions
    input.onKeyDownPressed = (event: KeyboardEvent) => {
      if (this.gameState === GameState.GAME_OVER) return

      // We don't allow holding down the keys to repeat actions
      input.keys[event.code] = !event.repeat
      
      this.onSelectorMove()
      this.onTileSwap()

      console.log('Updated grid:', this.grid)
    }
    // Scene actions
    this.throttle(1, () => {
      this.stageTicks++
      this.onMoveStage()
    })


    //this.throttle(30, () => this.onSelectorMove())
    //console.log('Run this every frame (60 fps)')
  }  
}

export default Game