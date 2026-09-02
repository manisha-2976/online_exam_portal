export const storeUserData = (data: { token: string; user: any }) => {
  localStorage.setItem('accessToken', data.token);
  localStorage.setItem('userData', JSON.stringify({
    id: data.user._id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role
  }));
};

export const clearUserData = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userData');
};

export const getUserRole = (): string | null => {
  const userData = localStorage.getItem('userData');
  if (!userData) return null;
  
  try {
    const { role } = JSON.parse(userData);
    return role;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const isTeacherOrAdmin = (): boolean => {
  const role = getUserRole();
  return role === 'teacher' || role === 'admin' || role === 'faculty';
}; 