import { GameObject, GameObjectProps } from 'gin/dist/src/core'

export enum TileType {
  BLUE = 'TILE_BLUE',
  GREEN = 'TILE_GREEN',
  PURPLE = 'TILE_PURPLE',
  RED = 'TILE_RED',
  YELLOW = 'TILE_YELLOW'
}

export enum TileState {
  CLEARING,
  IDLE,
  SELECTED
}

export interface TileProps extends GameObjectProps {
  type: TileType | null
  state: TileState | null
}

export class Tile extends GameObject {
  public type: TileType | null
  public state: TileState | null

  constructor(props: TileProps) {
    const { type, state } = props
    super(props)

    this.state = state
    this.type = type
  }
}