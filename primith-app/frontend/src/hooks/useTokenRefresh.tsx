// src/hooks/useTokenRefresh.ts
import { useEffect, useRef } from 'react';
import AuthService from '../services/auth';
import { jwtDecode } from "jwt-decode";

interface JWTPayload {
  exp: number;
}

export function useTokenRefresh() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const setupRefreshTimeout = async () => {
      console.log('Setting up token refresh cycle...');
      
      const tokens = AuthService.getTokens();
      const rdmTokens = AuthService.getRdmTokens()?.tokens;

      console.log('Current tokens status:', {
        hasPortalTokens: !!tokens?.token,
        hasRdmTokens: !!rdmTokens?.token
      });

      if (refreshTimeoutRef.current) {
        console.log('Clearing existing refresh timeout');
        clearTimeout(refreshTimeoutRef.current);
      }

      try {
        // Handle regular token refresh
        if (tokens?.token) {
          const payload = jwtDecode<JWTPayload>(tokens.token);
          const expiry = payload.exp * 1000;
          const timeUntilRefresh = expiry - Date.now() - 60000;
          
          console.log('Portal token status:', {
            expiryTime: new Date(expiry).toLocaleString(),
            timeUntilRefresh: Math.floor(timeUntilRefresh / 1000) + ' seconds'
          });

          if (timeUntilRefresh <= 0) {
            console.log('Portal token needs immediate refresh');
            const newTokens = await AuthService.refreshAccessToken();
            console.log('Portal token refresh result:', !!newTokens);
          } else {
            console.log(`Scheduling portal token refresh in ${Math.floor(timeUntilRefresh / 1000)} seconds`);
            refreshTimeoutRef.current = setTimeout(async () => {
              console.log('Executing scheduled portal token refresh');
              const newTokens = await AuthService.refreshAccessToken();
              console.log('Portal token refresh result:', !!newTokens);
              setupRefreshTimeout();
            }, timeUntilRefresh);
          }
        }

        // Handle RDM token refresh
        if (rdmTokens?.token) {
          const rdmPayload = jwtDecode<JWTPayload>(rdmTokens.token);
          const rdmExpiry = rdmPayload.exp * 1000;
          const rdmTimeUntilRefresh = rdmExpiry - Date.now() - 60000;

          console.log('RDM token status:', {
            expiryTime: new Date(rdmExpiry).toLocaleString(),
            timeUntilRefresh: Math.floor(rdmTimeUntilRefresh / 1000) + ' seconds'
          });

          if (rdmTimeUntilRefresh <= 0) {
            console.log('RDM token needs immediate refresh');
            const newTokens = await AuthService.refreshRdmAccessToken();
            console.log('RDM token refresh result:', !!newTokens);
          } else {
            console.log(`Scheduling RDM token refresh in ${Math.floor(rdmTimeUntilRefresh / 1000)} seconds`);
            refreshTimeoutRef.current = setTimeout(async () => {
              console.log('Executing scheduled RDM token refresh');
              const newTokens = await AuthService.refreshRdmAccessToken();
              console.log('RDM token refresh result:', !!newTokens);
              setupRefreshTimeout();
            }, rdmTimeUntilRefresh);
          }
        }
      } catch (error) {
        console.error('Error in token refresh cycle:', error);
      }
    };

    console.log('Token refresh hook mounted');
    setupRefreshTimeout();

    return () => {
      if (refreshTimeoutRef.current) {
        console.log('Token refresh hook unmounting, clearing timeout');
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
}