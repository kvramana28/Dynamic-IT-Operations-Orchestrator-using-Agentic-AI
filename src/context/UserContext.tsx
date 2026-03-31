import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface UserContextType {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
}

const defaultUser: User = {
  firstName: 'Alex',
  lastName: 'Rivera',
  email: 'alex.rivera@example.com',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(() => {
    const savedUser = localStorage.getItem('agentvirtus_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return defaultUser;
      }
    }
    return defaultUser;
  });

  useEffect(() => {
    localStorage.setItem('agentvirtus_user', JSON.stringify(user));
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
