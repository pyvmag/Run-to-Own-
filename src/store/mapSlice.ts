import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TileData {
  h3Index: string;
  ownerName: string | null;
  isCurrentUserOwner: boolean;
}

interface MapState {
  tiles: TileData[];
  isDarkTheme: boolean;
  mapStyle: string;
  isLoading: boolean;
}

const initialState: MapState = {
  tiles: [],
  isDarkTheme: false,
  mapStyle: 'https://api.maptiler.com/maps/basic-v2/style.json?key=dpvZMY5gns5lycvwB2Fb',
  isLoading: false,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setTiles: (state, action: PayloadAction<TileData[]>) => {
      state.tiles = action.payload;
    },
    toggleThemeState: (state, action: PayloadAction<boolean | undefined>) => {
      const nextDark = action.payload !== undefined ? action.payload : !state.isDarkTheme;
      state.isDarkTheme = nextDark;
      state.mapStyle = nextDark
        ? 'https://api.maptiler.com/maps/basic-v2-dark/style.json?key=dpvZMY5gns5lycvwB2Fb'
        : 'https://api.maptiler.com/maps/basic-v2/style.json?key=dpvZMY5gns5lycvwB2Fb';
    },
    setMapLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setTiles, toggleThemeState, setMapLoading } = mapSlice.actions;
export default mapSlice.reducer;
