export const Images: {[key: string]: string} = {
  SELECTOR: 'selector_01.svg',
  TILE_BLUE: 'tile_blue_01.svg',
  TILE_GREEN: 'tile_green_01.svg',
  TILE_PURPLE: 'tile_purple_01.svg',
  TILE_RED: 'tile_red_01.svg',
  TILE_YELLOW: 'tile_yellow_01.svg'
}

export const getImageDir = (path: string): string => `assets/images/${path}`