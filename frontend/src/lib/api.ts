export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    // Remove any leading slashes and ensure no double /api
    const cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/^api\//, '');
    const url = `${API_BASE_URL}/api/${cleanEndpoint}`;
    console.log('Making request to:', url);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      credentials: 'include',
      mode: 'cors'
    });

    // Log request details for debugging
    console.log('Request details:', {
      url,
      method: options.method || 'GET',
      headers: defaultHeaders,
      body: options.body
    });

    // Log response details for debugging
    console.log('Response details:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      } catch (e) {
        if (response.status === 404) {
          throw new Error(`Route not found: ${url}`);
        }
        throw new Error(response.statusText || 'Request failed');
      }
    }
    
    try {
      data = contentType?.includes('application/json') 
        ? await response.json()
        : await response.text();
    } catch (e) {
      console.error('Error parsing response:', e);
      throw new Error('Invalid response format');
    }

    return data;
  } catch (error: any) {
    console.error('API request failed:', error);
    if (error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
};

// Auth APIs
export const authApi = {
  register: async (userData: { name: string; email: string; password: string; role: string }) => {
    console.log('Registering user:', { ...userData, password: '***' });
    return fetchApi('auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (credentials: { email: string; password: string }) => {
    console.log('Logging in user:', { email: credentials.email });
    return fetchApi('auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  verifyOTP: async (data: { email: string; otp: string }) => {
    console.log('Verifying OTP for:', { email: data.email });
    return fetchApi('auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resendOTP: async (data: { email: string }) => {
    console.log('Resending OTP for:', { email: data.email });
    return fetchApi('auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCurrentUser: async () => {
    return fetchApi('users/me');
  },

  logout: async () => {
    return fetchApi('auth/logout', {
      method: 'POST',
    });
  },

  refreshToken: async () => {
    return fetchApi('auth/refresh-token', {
      method: 'POST'
    });
  }
};

// Question APIs
export const questionApi = {
  create: (question: any) =>
    fetchApi('/questions', {
      method: 'POST',
      body: JSON.stringify(question)
    }),

  getAll: () => fetchApi('/questions'),

  getById: (id: string) => fetchApi(`/questions/${id}`),

  update: (id: string, question: any) =>
    fetchApi(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(question)
    }),

  delete: (id: string) =>
    fetchApi(`/questions/${id}`, {
      method: 'DELETE'
    })
};

// Exam APIs
export const examApi = {
  create: (exam: any) =>
    fetchApi('/exams', {
      method: 'POST',
      body: JSON.stringify(exam)
    }),

  getAll: () => fetchApi('/exams'),

  getById: (id: string) => fetchApi(`/exams/${id}`),

  update: (id: string, exam: any) =>
    fetchApi(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exam)
    }),

  delete: (id: string) =>
    fetchApi(`/exams/${id}`, {
      method: 'DELETE'
    }),

  publish: (id: string) =>
    fetchApi(`/exams/${id}/publish`, {
      method: 'POST'
    }),
    
  start: (id: string) =>
    fetchApi(`/exams/${id}/start`, {
      method: 'POST'
    }),

  submit: (id: string, answers: any) =>
    fetchApi(`/exams/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    }),

  getAvailableStudents: () =>
    fetchApi('/exams/available-students')
      .then(response => {
        if (!response || !Array.isArray(response)) {
          throw new Error('Invalid response format from server');
        }
        return response;
      }),

  getRegisteredStudents: (id: string) =>
    fetchApi(`/exams/${id}/students`)
      .then(response => {
        if (!response || !Array.isArray(response)) {
          throw new Error('Invalid response format from server');
        }
        return response;
      }),

  addStudents: (id: string, studentIds: string[]) =>
    fetchApi(`/exams/${id}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentIds })
    }),

  removeStudents: (id: string, studentIds: string[]) =>
    fetchApi(`/exams/${id}/students`, {
      method: 'DELETE',
      body: JSON.stringify({ studentIds })
    }),

  getStudentSubmission: (examId: string) =>
    fetchApi(`/exams/${examId}/submission`)
};