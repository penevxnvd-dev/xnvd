# Data Fetching Guide

## Overview

This application uses a centralized API client (`/src/lib/api.ts`) to fetch data from the backend server.

## API Client Structure

The API client is located at `/src/lib/api.ts` and provides methods for:
- Authentication (login, register, getCurrentUser)
- Countries, Cities, Offices, Teams, Realtors
- Deals and Diagnoses
- Training Progress
- KPI calculations

## Basic Usage Pattern

### 1. Import the API client

```typescript
import { api } from '@/lib/api';
```

### 2. Create state variables

```typescript
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### 3. Create fetch function

```typescript
const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await api.getCountries(); // or any other API method
    setData(response);
  } catch (err) {
    console.error('Error fetching data:', err);
    setError(err instanceof Error ? err.message : 'Failed to fetch data');
  } finally {
    setLoading(false);
  }
};
```

### 4. Call fetch in useEffect

```typescript
useEffect(() => {
  fetchData();
}, []); // Empty array = run once on mount
```

## Common Patterns

### Pattern 1: Fetch on Component Mount

```typescript
useEffect(() => {
  fetchCountries();
}, []);

const fetchCountries = async () => {
  setLoading(true);
  try {
    const data = await api.getCountries();
    setCountries(data);
  } catch (error) {
    console.error('Error fetching countries:', error);
  } finally {
    setLoading(false);
  }
};
```

### Pattern 2: Fetch Based on Dependency

```typescript
useEffect(() => {
  if (realtorData?.id) {
    fetchTrainingProgress();
  }
}, [realtorData?.id]);

const fetchTrainingProgress = async () => {
  if (!realtorData?.id) return;
  // ... fetch logic
};
```

### Pattern 3: Fetch Multiple Data Sources in Parallel

```typescript
const fetchRealtorData = async () => {
  setLoading(true);
  
  try {
    const realtorProfile = await api.getCurrentRealtor();
    
    // Fetch multiple endpoints in parallel
    const [dealsData, diagnosesData] = await Promise.all([
      api.getMyDeals(),
      api.getMyDiagnoses()
    ]);
    
    setDeals(dealsData);
    setDiagnoses(diagnosesData);
  } catch (error) {
    console.error('Error fetching realtor data:', error);
  } finally {
    setLoading(false);
  }
};
```

### Pattern 4: Fetch with Parameters

```typescript
const fetchCities = async (countryId: string) => {
  setLoading(true);
  try {
    const data = await api.getCitiesByCountry(countryId);
    setCities(data);
  } catch (error) {
    console.error('Error fetching cities:', error);
  } finally {
    setLoading(false);
  }
};

// Call it
useEffect(() => {
  if (selectedCountryId) {
    fetchCities(selectedCountryId);
  }
}, [selectedCountryId]);
```

## Available API Methods

### Authentication
- `api.login(email, password)`
- `api.register(email, password, fullName)`
- `api.getCurrentUser()`
- `api.logout()`

### Countries
- `api.getCountries()`
- `api.createCountry(data)`
- `api.updateCountry(id, data)`
- `api.deleteCountry(id)`

### Cities
- `api.getCitiesByCountry(countryId)`
- `api.createCity(data)`
- `api.updateCity(id, data)`
- `api.deleteCity(id)`

### Offices
- `api.getOfficesByCity(cityId)`
- `api.getAllOfficesFull()`
- `api.getOfficeFull(officeId)`
- `api.createOffice(data)`
- `api.updateOffice(id, data)`
- `api.deleteOffice(id)`

### Teams
- `api.getTeamsByOffice(officeId)`
- `api.createTeam(data)`
- `api.updateTeam(id, data)`
- `api.deleteTeam(id)`

### Realtors
- `api.getRealtorsByTeam(teamId)`
- `api.getCurrentRealtor()`

### Deals
- `api.getMyDeals()`
- `api.createDeal(data)`

### Diagnoses
- `api.getMyDiagnoses()`
- `api.createDiagnosis(data)`

### Training
- `api.getTrainingProgress()`
- `api.updateTrainingProgress(data)`

### KPI
- `api.getTeamKPI(teamId)`
- `api.getOfficeKPI(officeId)`
- `api.getCityKPI(cityId)`
- `api.getCountryKPI(countryId)`
- `api.getRealtorKPI(realtorId)`

## Error Handling

The API client automatically:
- Handles 401 errors (unauthorized) by clearing token and redirecting to `/auth`
- Parses error messages from the server
- Throws errors that can be caught in try-catch blocks

Example error handling:

```typescript
try {
  const data = await api.getCountries();
  setCountries(data);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    // Show error to user
    setError(error.message);
  }
}
```

## Environment Configuration

The API URL is configured via environment variable:
- `VITE_API_URL` - defaults to `http://localhost:3001/api`

Make sure your `.env` file contains:
```
VITE_API_URL=http://localhost:3001/api
```

## Authentication

The API client automatically:
- Retrieves the token from `localStorage.getItem('token')`
- Adds it to the `Authorization` header as `Bearer {token}`
- Clears the token on 401 errors

## Complete Example

```typescript
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Country {
  id: string;
  name: string;
  code: string;
}

const CountriesList = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getCountries();
      setCountries(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch countries';
      setError(errorMessage);
      console.error('Error fetching countries:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {countries.map(country => (
        <div key={country.id}>{country.name}</div>
      ))}
    </div>
  );
};

export default CountriesList;
```

## Best Practices

1. **Always use try-catch** for error handling
2. **Set loading state** to show loading indicators
3. **Use finally block** to ensure loading state is reset
4. **Handle errors gracefully** - show user-friendly messages
5. **Use Promise.all** for parallel requests when possible
6. **Clean up** - cancel requests if component unmounts (optional, using AbortController)

## Advanced: Request Cancellation

For long-running requests, you can cancel them:

```typescript
useEffect(() => {
  const abortController = new AbortController();
  
  const fetchData = async () => {
    try {
      // Note: The current API client doesn't support AbortSignal yet
      // This is a future enhancement
      const data = await api.getCountries();
      setCountries(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
      }
    }
  };
  
  fetchData();
  
  return () => {
    abortController.abort();
  };
}, []);
```

