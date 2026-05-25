import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Athlete {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  city: string;
  country: string;
  profile: string;
  profile_medium: string;
}

interface AuthState {
  athlete: Athlete | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  athlete: null,
  isAuthenticated: false,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAthlete: (state, action: PayloadAction<Athlete | null>) => {
      state.athlete = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false;
    },
    clearAthlete: (state) => {
      state.athlete = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setAthlete, clearAthlete, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
