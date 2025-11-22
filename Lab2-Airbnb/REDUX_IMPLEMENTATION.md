# Redux Implementation for Lab2 Airbnb Frontend

## Overview

Redux Toolkit is integrated into the Lab2 Airbnb frontend to manage global application state including user authentication, property data, booking management, and real-time notifications from Kafka events.

## Architecture

### Redux Store Structure

```
store/
├── store.js                    # Store configuration
└── slices/
    ├── authSlice.js           # Authentication & JWT management
    ├── propertySlice.js       # Property listings & favorites
    ├── bookingSlice.js        # Booking operations & cart
    └── notificationSlice.js   # Real-time notifications
```

## State Management

### 1. Authentication State (authSlice)

**Purpose**: Manage user authentication, JWT tokens, and user profile

**State Shape**:
```javascript
{
  user: {
    _id: "uuid",
    username: "string",
    email: "string",
    user_type: "traveler|owner",
    profile: {}
  },
  token: "jwt_token",
  isAuthenticated: boolean,
  userType: "traveler|owner",
  isLoading: boolean,
  error: string | null
}
```

**Actions**:
- `registerUser(userData)` - Register new user
- `loginUser(credentials)` - Login and store JWT token
- `logoutUser()` - Clear authentication state
- `fetchCurrentUser()` - Fetch user profile
- `updateUserProfile(profileData)` - Update user information

**Selectors**:
- `selectAuth` - Full auth state
- `selectUser` - Current user object
- `selectToken` - JWT token
- `selectIsAuthenticated` - Authentication status
- `selectUserType` - User type (traveler/owner)

**Usage Example**:
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, selectUser, selectIsAuthenticated } from './store/slices/authSlice';

function LoginComponent() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  const handleLogin = async (credentials) => {
    try {
      await dispatch(loginUser(credentials)).unwrap();
      // Login successful, JWT stored in localStorage and Redux
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  return (
    // ... JSX
  );
}
```

### 2. Property State (propertySlice)

**Purpose**: Manage property listings, search results, and user favorites

**State Shape**:
```javascript
{
  properties: [],
  currentProperty: null,
  favorites: [],
  searchResults: [],
  filters: {
    location: "",
    checkIn: null,
    checkOut: null,
    guests: 1,
    priceRange: { min: 0, max: 10000 },
    propertyType: "",
    amenities: []
  },
  isLoading: boolean,
  error: string | null
}
```

**Actions**:
- `fetchProperties(filters)` - Fetch all properties with filters
- `fetchPropertyById(propertyId)` - Fetch single property details
- `searchProperties(searchParams)` - Search properties
- `fetchFavorites()` - Get user's favorite properties
- `addFavorite(listingId)` - Add property to favorites
- `removeFavorite(listingId)` - Remove from favorites
- `setFilters(filters)` - Update search filters
- `clearFilters()` - Reset filters

**Selectors**:
- `selectAllProperties` - All properties
- `selectCurrentProperty` - Currently viewed property
- `selectFavorites` - User's favorite properties
- `selectSearchResults` - Search results
- `selectFilters` - Current search filters
- `selectIsFavorite(listingId)` - Check if property is favorited

**Usage Example**:
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchProperties, selectAllProperties, selectPropertyLoading } from './store/slices/propertySlice';

function PropertyList() {
  const dispatch = useDispatch();
  const properties = useSelector(selectAllProperties);
  const loading = useSelector(selectPropertyLoading);
  
  useEffect(() => {
    dispatch(fetchProperties({ location: 'San Francisco' }));
  }, [dispatch]);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {properties.map(property => (
        <PropertyCard key={property._id} property={property} />
      ))}
    </div>
  );
}
```

### 3. Booking State (bookingSlice)

**Purpose**: Manage booking operations, cart, and booking status

**State Shape**:
```javascript
{
  bookings: [],
  currentBooking: null,
  cart: [],
  isLoading: boolean,
  error: string | null,
  bookingStatus: "idle|creating|success|error"
}
```

**Actions**:
- `createBooking(bookingData)` - Create new booking request
- `fetchUserBookings()` - Get user's bookings
- `fetchBookingById(bookingId)` - Get single booking
- `updateBookingStatus({bookingId, status})` - Update booking
- `cancelBooking(bookingId)` - Cancel booking
- `acceptBooking(bookingId)` - Owner accepts booking
- `rejectBooking({bookingId, reason})` - Owner rejects booking
- `addToCart(bookingData)` - Add to cart
- `removeFromCart(listingId)` - Remove from cart
- `clearCart()` - Clear cart

**Selectors**:
- `selectAllBookings` - All user bookings
- `selectCurrentBooking` - Currently viewed booking
- `selectCart` - Shopping cart items
- `selectBookingStatus` - Booking creation status
- `selectPendingBookings` - Bookings awaiting confirmation
- `selectConfirmedBookings` - Confirmed bookings

**Usage Example**:
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { createBooking, selectBookingStatus } from './store/slices/bookingSlice';

function BookingForm({ listingId }) {
  const dispatch = useDispatch();
  const bookingStatus = useSelector(selectBookingStatus);
  
  const handleSubmit = async (bookingData) => {
    try {
      await dispatch(createBooking({
        listing_id: listingId,
        check_in: bookingData.checkIn,
        check_out: bookingData.checkOut,
        guest_count: bookingData.guests
      })).unwrap();
      
      // Booking created successfully
      // Kafka event published automatically by backend
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };
  
  return (
    // ... form JSX
  );
}
```

### 4. Notification State (notificationSlice)

**Purpose**: Manage real-time notifications from Kafka events

**State Shape**:
```javascript
{
  notifications: [],
  unreadCount: 0,
  isLoading: boolean,
  error: string | null
}
```

**Actions**:
- `fetchNotifications()` - Fetch all notifications
- `markNotificationAsRead(notificationId)` - Mark as read
- `markAllAsRead()` - Mark all as read
- `addNotification(notification)` - Add new notification (from Kafka)
- `clearNotifications()` - Clear all notifications

**Selectors**:
- `selectAllNotifications` - All notifications
- `selectUnreadNotifications` - Only unread
- `selectUnreadCount` - Count of unread
- `selectBookingNotifications` - Booking-related notifications

**Usage Example**:
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, selectUnreadCount, markNotificationAsRead } from './store/slices/notificationSlice';

function NotificationBell() {
  const dispatch = useDispatch();
  const unreadCount = useSelector(selectUnreadCount);
  
  useEffect(() => {
    // Fetch notifications on mount
    dispatch(fetchNotifications());
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dispatch]);
  
  return (
    <div className="notification-bell">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
    </div>
  );
}
```

## Redux DevTools Integration

Redux DevTools are enabled in development mode for debugging and state inspection.

**Features**:
- Time-travel debugging
- Action history
- State diff visualization
- Action replay

**Browser Extension**: Install Redux DevTools Extension for Chrome/Firefox

## Data Flow

### Example: Complete Booking Flow with Redux

1. **User creates booking**:
```javascript
dispatch(createBooking(bookingData))
// → authSlice provides JWT token
// → Booking Service creates booking in MongoDB
// → Booking Service publishes Kafka event
// → bookingSlice updates with new booking
```

2. **Owner receives notification**:
```javascript
// → Owner Service consumes Kafka event
// → Notification created in MongoDB
// → Frontend polls notifications
dispatch(fetchNotifications())
// → notificationSlice updates
// → UI shows new notification
```

3. **Owner accepts booking**:
```javascript
dispatch(acceptBooking(bookingId))
// → Owner Service updates MongoDB
// → Owner Service publishes Kafka event
// → bookingSlice updates booking status
```

4. **Traveler receives update**:
```javascript
// → Traveler Service consumes Kafka event
// → Notification created
// → Frontend polls notifications
dispatch(fetchNotifications())
// → notificationSlice shows booking confirmed
```

## Middleware

### Default Middleware (Redux Toolkit)
- **redux-thunk**: Async action handling
- **Immutability Check**: Development only
- **Serializability Check**: Development only (configured to ignore dates)

### Custom Configuration
```javascript
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['auth/login/fulfilled'],
      ignoredPaths: ['auth.user.createdAt'],
    },
  }),
```

## Performance Optimization

### 1. Selector Memoization
Using `createSelector` from Redux Toolkit:
```javascript
import { createSelector } from '@reduxjs/toolkit';

export const selectExpensiveProperties = createSelector(
  [selectAllProperties, selectFilters],
  (properties, filters) => {
    return properties.filter(p => 
      p.price_per_night > filters.priceRange.min &&
      p.price_per_night < filters.priceRange.max
    );
  }
);
```

### 2. Code Splitting
Lazy load Redux slices:
```javascript
const AuthPage = lazy(() => import('./pages/AuthPage'));
```

### 3. Normalized State
Properties and bookings use normalized structures with IDs for efficient lookups.

## Error Handling

### Async Action Error Handling
```javascript
try {
  await dispatch(createBooking(data)).unwrap();
  // Success
} catch (error) {
  // Error from rejectWithValue
  console.error(error);
}
```

### Error State Management
Each slice has an `error` field that stores error messages:
```javascript
const error = useSelector(selectBookingError);
if (error) {
  return <ErrorMessage message={error} />;
}
```

## Testing

### Unit Tests for Reducers
```javascript
import bookingReducer, { createBooking } from './bookingSlice';

test('should handle booking creation', () => {
  const previousState = { bookings: [] };
  expect(
    bookingReducer(previousState, createBooking.fulfilled(mockBooking))
  ).toEqual({
    bookings: [mockBooking],
    // ... other state
  });
});
```

### Integration Tests with Mock Store
```javascript
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

const store = configureStore({
  reducer: { bookings: bookingReducer },
  preloadedState: { bookings: mockState }
});

render(
  <Provider store={store}>
    <BookingList />
  </Provider>
);
```

## Best Practices

### 1. Always Use Selectors
```javascript
// ✅ Good
const user = useSelector(selectUser);

// ❌ Bad
const user = useSelector(state => state.auth.user);
```

### 2. Dispatch Actions for All State Changes
```javascript
// ✅ Good
dispatch(setFilters({ location: 'NYC' }));

// ❌ Bad - never mutate state directly
state.filters.location = 'NYC';
```

### 3. Use Redux DevTools
- Monitor all actions
- Inspect state changes
- Time-travel debugging
- Export/import state for bug reproduction

### 4. Keep Components Decoupled
- Use selectors to access state
- Use actions to modify state
- Components should not know about state structure

### 5. Async Actions with createAsyncThunk
```javascript
export const fetchData = createAsyncThunk(
  'slice/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.getData(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

## Migration from Lab 1

### Changes from Lab 1 to Lab 2

| Feature | Lab 1 | Lab 2 (Redux) |
|---------|-------|---------------|
| State Management | Component state / Context API | Redux Toolkit |
| Authentication | Local state | Redux + localStorage |
| Property Data | API calls in components | Redux async thunks |
| Bookings | Component state | Redux with cart feature |
| Notifications | None | Redux with Kafka integration |
| DevTools | React DevTools only | React + Redux DevTools |
| Persistence | None | localStorage for auth |

## Environment Variables

Create `.env` file in frontend directory:
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_PROPERTY_API_URL=http://localhost:5003
REACT_APP_BOOKING_API_URL=http://localhost:5004
```

## Troubleshooting

### Common Issues

**Issue**: State not persisting across page refreshes
- **Solution**: Use `localStorage` in auth slice (already implemented)

**Issue**: Actions not dispatching
- **Solution**: Check middleware configuration, use `.unwrap()` for error handling

**Issue**: Selectors returning stale data
- **Solution**: Use `createSelector` for memoization

**Issue**: Redux DevTools not working
- **Solution**: Install browser extension, ensure `devTools: true` in store config

## Screenshots Required for Report

1. **Redux DevTools showing state tree**
   - Auth state with JWT token
   - Properties array
   - Bookings list

2. **Action timeline in DevTools**
   - Login action
   - Fetch properties action
   - Create booking action
   - Booking update notification

3. **State diff after booking creation**
   - Before: empty bookings array
   - After: booking added to array

4. **Notification state update from Kafka event**
   - Show unread count incrementing
   - Notification added to array

## References

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React-Redux Hooks](https://react-redux.js.org/api/hooks)
- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
- [Redux Best Practices](https://redux.js.org/style-guide/style-guide)

