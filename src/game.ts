import { AssetManager, GameObject, Process, Scene, SceneManager, Vector2D } from 'gin/dist/src/core'
import { Position } from 'gin/dist/src/core/types'
import { Input} from 'gin/dist/src/io'
import { KeyboardSchema, LayerType, Tile, TileState, TileType } from './types'
import { getAssets } from './boot'
import { Images } from './assets'

const input = Input.shared
const assetManager = AssetManager.manager
const sceneManager = SceneManager.shared

class Game extends Process {
  private THROTTLE_TO_FPS = 30
  private ROWS = 8
  private COLUMNS = 6
  private TILE_SIZE = 64

  public scene: Scene = new Scene('DEMO_STAGE', this.ROWS*32, this.COLUMNS*32)
  public grid: Tile[][]

  public selector: GameObject
  public selectorIndex: Vector2D = new Vector2D(2, 4) // Position in grid; 0,1 .. 1,1
  private defaultSelectorPosition: Vector2D = new Vector2D(this.selectorIndex.x * this.TILE_SIZE, this.selectorIndex.y * this.TILE_SIZE)

  constructor() {
    super()

    this.setTileState({ x: 0, y: 0 }, TileState.SELECTED) // Set the initially selected tile
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
        id: `${y},${x}`,
        type: null, 
        state: null,
        width: this.TILE_SIZE,
        height: this.TILE_SIZE,
        zIndex: LayerType.TILE,
        position: new Vector2D(x * this.TILE_SIZE, y * this.TILE_SIZE)
      }))
    )

    // Add grid (blocks) to scene
    console.log('flat grid:', this.grid.flat())
    //this.grid.flat().forEach((tile: Tile) => this.scene.addObjectToScene(tile))

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
    
    // Generate the bottom four rows
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
          // Note:We check for next rows since we build rows from the bottom up
          (type === this.grid?.[y + 1]?.[i]?.type && type === this.grid?.[y + 2]?.[i]?.type)
        ) return getRandomTileType.bind(this)()
        return type
      }

      const row = this.grid[y]
      let randomTileType: TileType = getRandomTileType.bind(this)()

      tile.state = TileState.IDLE
      tile.type = randomTileType
      tile.sprite = assetManager.getImageById(randomTileType) as HTMLImageElement

      this.scene.setObjectById(tile.id, tile)
    })
  }

  private destroyRow(y: number = 0): void {
    this.grid.splice(y, 1)
  }

  private onSelectorMove(): void {
    const { x, y } = this.selectorIndex

    if (input.getDirectionX().equals(Vector2D.ZERO) && input.getDirectionY().equals(Vector2D.ZERO)) return // Only evaluate when moving

    if (Object.values(input.keys).filter(key => key).length > 1) return // Can only press one key at a time

    const maxX = new Vector2D(this.COLUMNS - 2, 0) // -2 due to 1x2 selector
    const maxY = new Vector2D(0, this.ROWS - 1)

    this.setTileState(this.selectorIndex, null) // Set previous selected tile state to null

    const updatedX = new Vector2D(x + input.getDirectionX().x, 0).clamp(Vector2D.ZERO, maxX).x
    const updatedY = new Vector2D(0, y + input.getDirectionY().y ).clamp(Vector2D.ZERO, maxY).y

    this.setTileState({ x: updatedX, y: updatedY }, TileState.SELECTED) // Set newly selected tile state to selected

    this.selectorIndex.set(updatedX, updatedY)
    this.selector.position.x = updatedX * this.TILE_SIZE
    this.selector.position.y = updatedY * this.TILE_SIZE
    //console.log('selectorIndex ->', this.selectorIndex.x, this.selectorIndex.y)
    //console.log('Updated grid:', this.grid.map(row => row.map(col => ({ id: col.id, sprite: col.sprite }))))
  }

  private onTileSwap(): void {
    const schema = input.getSchema<typeof KeyboardSchema>()
    if (input.isPressed(schema.SWAP)) this.swapTiles()
  }

  private onMoveStage(): void {
    // TODO: slowly move the entire stage up
    
  }

  private setTileState(pos: Position, state: TileState | null): void {
    if (!this.grid) return
    this.grid[pos.y]![pos.x]!.state = state
  }

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

    x1.id = x0Id
    x1.position = x0Pos

    console.log('x0', x0)
    console.log('x1', x1)
    this.grid[y]![x] = x1
    this.grid[y]![x + 1] = x0

    this.scene.setObjectById(x0.id, x1)
    this.scene.setObjectById(x1.id, x0)
    console.log('Updated grid:', this.grid.map(row => row.map(({ id, type }) => ({ id, type }))))
  }

  protected onUpdate?(delta: number, fps: number): void {
    input.onKeyDownPressed = (event: KeyboardEvent) => {
        // We don't allow holding down the keys to repeat actions
        input.keys[event.code] = !event.repeat

        // Actions
        this.onSelectorMove()
        this.onTileSwap()
    }
    //this.throttle(30, () => this.onSelectorMove())
    //console.log('Run this every frame (60 fps)')
  }  
}

export default Game