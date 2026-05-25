import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FriendUser {
  id: number;
  username: string;
  totalDistance: number;
  currentStreak: number;
  bestStreak?: number;
}

export interface PendingRequest {
  id: number;
  requesterId: number;
  requester: FriendUser;
  actionTimestamp: string;
}

export interface AcceptedFriendship {
  id: number;
  requesterId: number;
  addresseeId: number;
  requester: FriendUser;
  addressee: FriendUser;
}

interface FriendsState {
  searchResults: FriendUser[];
  pendingRequests: PendingRequest[];
  friendsList: AcceptedFriendship[];
  isLoading: boolean;
}

const initialState: FriendsState = {
  searchResults: [],
  pendingRequests: [],
  friendsList: [],
  isLoading: false,
};

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    setSearchResults: (state, action: PayloadAction<FriendUser[]>) => {
      state.searchResults = action.payload;
    },
    setPendingRequests: (state, action: PayloadAction<PendingRequest[]>) => {
      state.pendingRequests = action.payload;
    },
    setFriendsList: (state, action: PayloadAction<AcceptedFriendship[]>) => {
      state.friendsList = action.payload;
    },
    setFriendsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setSearchResults, setPendingRequests, setFriendsList, setFriendsLoading } = friendsSlice.actions;
export default friendsSlice.reducer;
