const API_URL = 'http://localhost:8000/api';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'savePassword') {
        handleSavePassword(request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Required for async response
    } else if (request.action === 'getPassword') {
        handleGetPassword(request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Required for async response
    } else if (request.action === 'updatePassword') {
        handleUpdatePassword(request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Required for async response
    }
});

// Function to handle saving password
async function handleSavePassword(data) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const response = await fetch(`${API_URL}/passwords`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            return { success: true };
        } else {
            if (response.status === 400 && responseData.detail && responseData.detail.includes('already exists')) {
                return { 
                    success: false, 
                    error: responseData.detail,
                    isDuplicate: true
                };
            }
            throw new Error(responseData.detail || 'Failed to save password');
        }
    } catch (error) {
        console.error('Save password error:', error);
        return { success: false, error: error.message };
    }
}

// Function to handle getting password
async function handleGetPassword(data) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const response = await fetch(`${API_URL}/passwords`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const passwords = await response.json();
            const matchingPassword = passwords.find(p => p.website === data.website);
            
            if (matchingPassword) {
                // Get the decrypted password
                const passwordResponse = await fetch(`${API_URL}/passwords/${matchingPassword.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (passwordResponse.ok) {
                    const passwordData = await passwordResponse.json();
                    return {
                        success: true,
                        data: {
                            username: matchingPassword.username,
                            password: passwordData.password
                        }
                    };
                }
            }
            return { success: false, error: 'No matching password found' };
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to get passwords');
        }
    } catch (error) {
        console.error('Get password error:', error);
        return { success: false, error: error.message };
    }
}

// Function to handle updating password
async function handleUpdatePassword(data) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const response = await fetch(`${API_URL}/passwords/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (response.ok) {
            return { success: true, message: 'Password updated successfully!' };
        } else {
            throw new Error(responseData.detail || 'Failed to update password');
        }
    } catch (error) {
        console.error('Update password error:', error);
        return { success: false, error: error.message };
    }
} 