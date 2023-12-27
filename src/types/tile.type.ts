import { GameObject, GameObjectProps } from 'gin/dist/src/core'
import { createUniqueId } from '../utils'

export enum TileType {
  BLUE = 'TILE_BLUE',
  GREEN = 'TILE_GREEN',
  PURPLE = 'TILE_PURPLE',
  RED = 'TILE_RED',
  YELLOW = 'TILE_YELLOW'
}

export enum TileState {
  DEFAULT,
  CLEARED,
  FALLING,
  URGENT  
}

export interface TileProps extends Omit<GameObjectProps, 'id'> {
  id?: string
  type: TileType | null
  state: TileState | null
}

export class Tile extends GameObject {
  public type: TileType | null
  public state: TileState | null

  constructor(props: TileProps) {
    const { id, type, state } = props
    super({ ...props, id: id || createUniqueId() })

    this.state = state
    this.type = type
  }

  get isActive() { 
    return this.state !== null && (this.state as number) >= 0
  }
}