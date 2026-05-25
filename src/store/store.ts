import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import mapReducer from './mapSlice';
import friendsReducer from './friendsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    map: mapReducer,
    friends: friendsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
