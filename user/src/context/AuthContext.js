import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMeApi, switchModeApi } from '../../services/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user_data';
const ROLE_KEY = 'auth_active_role';

// Legacy keys for smooth backwards compatibility
const LEGACY_TOKEN_KEY = '@user_jwt_token';
const LEGACY_USER_KEY = '@user_profile_data';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState('customer'); // 'customer' | 'vendor'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      setIsLoading(true);

      // Check current or legacy storage
      let storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      let storedUser = await AsyncStorage.getItem(USER_KEY);
      let storedRole = await AsyncStorage.getItem(ROLE_KEY);

      if (!storedToken) {
        storedToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
        storedUser = await AsyncStorage.getItem(LEGACY_USER_KEY);
      }

      if (storedToken) {
        setToken(storedToken);

        let parsedUser = null;
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
          } catch (e) {
            console.warn('Failed parsing stored user JSON:', e);
          }
        }

        const activeRole = storedRole || parsedUser?.role || (parsedUser?.businessName ? 'vendor' : 'customer');
        setRole(activeRole);
        if (parsedUser) {
          setUser({ ...parsedUser, role: activeRole });
        }

        // Fetch fresh profile from backend
        const res = await getMeApi(storedToken);
        if (res.success && res.user) {
          const freshRole = res.role || res.user.role || activeRole;
          const freshUser = { ...res.user, role: freshRole };
          setUser(freshUser);
          setRole(freshRole);
          await AsyncStorage.setItem(TOKEN_KEY, storedToken);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          await AsyncStorage.setItem(ROLE_KEY, freshRole);
        }
      }
    } catch (error) {
      console.error('Error loading stored auth session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log in user or vendor
   */
  const login = async (newToken, userData, explicitRole) => {
    try {
      const detectedRole = explicitRole || userData?.role || (userData?.businessName ? 'vendor' : 'customer');
      const normalizedUser = {
        ...userData,
        role: detectedRole,
      };

      setToken(newToken);
      setUser(normalizedUser);
      setRole(detectedRole);

      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
      await AsyncStorage.setItem(ROLE_KEY, detectedRole);

      // Also set legacy key for any remaining external calls
      await AsyncStorage.setItem(LEGACY_TOKEN_KEY, newToken);
    } catch (error) {
      console.error('Error saving login session:', error);
    }
  };

  /**
   * Log out session
   */
  const logout = async () => {
    try {
      setToken(null);
      setUser(null);
      setRole('customer');

      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      await AsyncStorage.removeItem(ROLE_KEY);
      await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
      await AsyncStorage.removeItem(LEGACY_USER_KEY);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  /**
   * Update active user attributes
   */
  const updateUser = async (updatedUserData) => {
    try {
      const mergedUser = { ...user, ...updatedUserData };
      setUser(mergedUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
    } catch (error) {
      console.error('Error updating user state:', error);
    }
  };

  /**
   * Seamlessly switch between Customer and Vendor mode
   * @param {'customer' | 'vendor'} newRole 
   * @returns {Promise<{ success: boolean, requiresOnboarding?: boolean, message?: string }>}
   */
  const switchMode = async (newRole) => {
    try {
      if (!token) return { success: false, message: 'Not logged in' };

      const res = await switchModeApi(token, newRole);

      if (res.requiresOnboarding) {
        return {
          success: false,
          requiresOnboarding: true,
          mobileNumber: res.mobileNumber || user?.phone || user?.mobileNumber,
        };
      }

      if (res.success && res.user) {
        const switchedToken = res.token || token;
        const switchedRole = res.role || newRole;
        const switchedUser = { ...res.user, role: switchedRole };

        setToken(switchedToken);
        setUser(switchedUser);
        setRole(switchedRole);

        await AsyncStorage.setItem(TOKEN_KEY, switchedToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(switchedUser));
        await AsyncStorage.setItem(ROLE_KEY, switchedRole);

        return { success: true, role: switchedRole, user: switchedUser };
      }

      // If backend switch returned error, try local mode toggle if valid
      if (user?.businessName && newRole === 'vendor') {
        const switchedUser = { ...user, role: 'vendor' };
        setUser(switchedUser);
        setRole('vendor');
        await AsyncStorage.setItem(ROLE_KEY, 'vendor');
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(switchedUser));
        return { success: true, role: 'vendor' };
      }

      return { success: false, message: res.message || 'Failed to switch mode' };
    } catch (error) {
      console.error('Error in switchMode:', error);
      return { success: false, message: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: role || user?.role || 'customer',
        isLoading,
        isAuthenticated: !!token && !!user,
        loadStoredSession,
        login,
        logout,
        updateUser,
        switchMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
