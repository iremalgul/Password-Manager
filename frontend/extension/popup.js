const API_URL = 'http://localhost:8000/api';

// UI Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const mainInterface = document.getElementById('main-interface');
const passwordList = document.getElementById('password-list');

// Add event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    document.getElementById('login-button').addEventListener('click', login);
    document.getElementById('show-register-link').addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });

    // Register form
    document.getElementById('register-button').addEventListener('click', register);
    document.getElementById('show-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    // Main interface
    document.getElementById('save-password-button').addEventListener('click', savePassword);
    document.getElementById('logout-button').addEventListener('click', logout);

    // Check authentication status
    checkAuthStatus();
});

// Check authentication status
async function checkAuthStatus() {
    const { token, username } = await chrome.storage.local.get(['token', 'username']);
    console.log('Auth check - Token:', token, 'Username:', username); // Debug log
    
    if (token) {
        showMainInterface();
        // Wait for passwords to load
        await loadPasswords();
        // Display username
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay && username) {
            usernameDisplay.innerHTML = `Welcome, <strong>${username}</strong>`;
        }
    }
}

// Show/Hide UI elements
function showLogin() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    mainInterface.classList.add('hidden');
}

function showRegister() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    mainInterface.classList.add('hidden');
}

function showMainInterface() {
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    mainInterface.classList.remove('hidden');
    
    // Ensure password list starts closed
    passwordList.classList.remove('active');
    
    // Add click handler for show passwords button
    const showPasswordsButton = document.getElementById('show-passwords-button');
    if (showPasswordsButton) {
        // Remove any existing event listeners
        const newButton = showPasswordsButton.cloneNode(true);
        showPasswordsButton.parentNode.replaceChild(newButton, showPasswordsButton);
        
        // Set initial button text
        newButton.textContent = 'Show Passwords';
        
        newButton.addEventListener('click', async () => {
            const success = await loadPasswords();
            if (success) {
                passwordList.classList.toggle('active');
                newButton.textContent = passwordList.classList.contains('active') ? 'Hide Passwords' : 'Show Passwords';
            }
        });
    }
}

// Authentication functions
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'username': username,
                'password': password,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Login response:', data); // Debug log
            
            // Store token and username separately to ensure both are saved
            await chrome.storage.local.set({ token: data.access_token });
            await chrome.storage.local.set({ username: username });
            
            // Verify both token and username were stored
            const stored = await chrome.storage.local.get(['token', 'username']);
            console.log('Stored data:', stored); // Debug log
            
            if (!stored.token || !stored.username) {
                throw new Error('Failed to store login data');
            }
            
            showMainInterface();
            // Load passwords immediately after login
            await loadPasswords();
            // Display username
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.innerHTML = `Welcome, <strong>${stored.username}</strong>`;
            }
        } else {
            const errorData = await response.json();
            console.error('Login failed:', errorData); // Debug log
            showPopup('Login Failed', errorData.detail || 'Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showPopup('Login Error', 'An error occurred during login.');
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            showPopup('Registration Successful', 'You have been registered successfully! Please log in.', 'success');
            showLogin();
        } else {
            // Handle different types of error responses
            let errorMessage = 'Registration failed.';
            if (data.detail) {
                if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else if (Array.isArray(data.detail)) {
                    errorMessage = data.detail.map(err => err.msg).join(', ');
                } else if (typeof data.detail === 'object') {
                    errorMessage = Object.values(data.detail).join(', ');
                }
            }
            showPopup('Registration Failed', errorMessage, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showPopup('Registration Error', 'An error occurred during registration.', 'error');
    }
}

async function logout() {
    try {
        await chrome.storage.local.remove(['token', 'username']);
        showPopup('Logged Out', 'You have been logged out successfully.', 'success');
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
        showPopup('Logout Error', 'An error occurred while logging out.', 'error');
    }
}

// Password management functions
async function updatePassword(website, username, password) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/passwords/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                website,
                username,
                password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            loadPasswords();
            // Clear form
            document.getElementById('save-website').value = '';
            document.getElementById('save-username').value = '';
            document.getElementById('save-password').value = '';
            showPopup('Password Updated', 'Password updated successfully!');
        } else {
            showPopup('Update Failed', data.detail || 'Unknown error');
        }
    } catch (error) {
        console.error('Update password error:', error);
        showPopup('Update Error', 'An error occurred while updating the password. Please try again.');
    }
}

async function savePassword() {
    const { token } = await chrome.storage.local.get('token');
    console.log('Token status:', token ? 'Token exists' : 'No token');
    
    if (!token) {
        showLogin();
        return;
    }

    const website = document.getElementById('save-website').value;
    const username = document.getElementById('save-username').value;
    const password = document.getElementById('save-password').value;

    if (!website || !username || !password) {
        showPopup('Save Error', 'Please fill in all fields.');
        return;
    }

    try {
        console.log('Sending request to save password...');
        const response = await fetch(`${API_URL}/passwords`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                website,
                username,
                password,
            }),
        });

        console.log('Response status:', response.status);
        let data;
        try {
            data = await response.json();
            console.log('Response data:', data);
        } catch (e) {
            console.error('Error parsing response:', e);
            throw new Error('Invalid response from server');
        }

        if (response.ok) {
            loadPasswords();
            // Clear form
            document.getElementById('save-website').value = '';
            document.getElementById('save-username').value = '';
            document.getElementById('save-password').value = '';
            showPopup('Password Saved', 'Password saved successfully!');
        } else {
            console.log('Error response:', response.status, data);
            if (response.status === 400 && data.detail) {
                if (data.detail.includes('already exists')) {
                    if (confirm(data.detail)) {
                        await updatePassword(website, username, password);
                    }
                } else {
                    showPopup('Save Error', data.detail);
                }
            } else if (response.status === 401) {
                showPopup('Session Expired', 'Your session has expired. Please log in again.');
                showLogin();
            } else {
                showPopup('Save Error', data.detail || 'Unknown error');
            }
        }
    } catch (error) {
        console.error('Save password error:', error);
        showPopup('Save Error', 'An error occurred while saving the password. Please try again.');
    }
}

async function loadPasswords() {
    const { token } = await chrome.storage.local.get('token');
    console.log('Retrieved token:', token); // Debug log
    
    if (!token) {
        console.log('No token found, showing login form'); // Debug log
        showLogin();
        return false;
    }

    try {
        console.log('Making API request with token:', token); // Debug log
        const response = await fetch(`${API_URL}/passwords`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('API response status:', response.status); // Debug log
        
        if (response.ok) {
            const passwords = await response.json();
            console.log('Retrieved passwords:', passwords); // Debug log
            displayPasswords(passwords);
            return true; // Indicate successful load
        } else {
            const errorData = await response.json();
            console.error('API error:', errorData); // Debug log
            showPopup('Load Error', errorData.detail || 'Unknown error', 'error');
            return false; // Indicate failed load
        }
    } catch (error) {
        console.error('Load passwords error:', error);
        showPopup('Load Error', 'An error occurred while loading passwords.', 'error');
        return false; // Indicate failed load
    }
}

function displayPasswords(passwords) {
    passwordList.innerHTML = '';
    passwords.forEach(password => {
        const div = document.createElement('div');
        div.className = 'password-item';
        
        // Create header (clickable area)
        const header = document.createElement('div');
        header.className = 'password-header';
        header.innerHTML = `<strong>${password.website}</strong>`;
        
        // Create content area (initially hidden)
        const content = document.createElement('div');
        content.className = 'password-content';
        content.innerHTML = `
            <div>Username: ${password.username}</div>
            <div class="button-group">
                <button class="copy-button">Copy Password</button>
                <button class="edit-button">Edit</button>
                <button class="delete-button">Delete</button>
            </div>
        `;
        
        // Add click handler for dropdown
        header.addEventListener('click', () => {
            content.classList.toggle('active');
        });
        
        // Add button handlers
        content.querySelector('.copy-button').addEventListener('click', () => copyPassword(password.id));
        content.querySelector('.delete-button').addEventListener('click', () => deletePassword(password.id));
        
        // Edit button handler
        content.querySelector('.edit-button').addEventListener('click', () => {
            const editForm = document.createElement('div');
            editForm.className = 'edit-form';
            editForm.innerHTML = `
                <input type="text" id="edit-website-${password.id}" value="${password.website}" placeholder="Website">
                <input type="text" id="edit-username-${password.id}" value="${password.username}" placeholder="Username">
                <input type="password" id="edit-password-${password.id}" placeholder="New Password">
                <div class="button-group">
                    <button class="save-edit">Save</button>
                    <button class="cancel-edit">Cancel</button>
                </div>
            `;
            
            // Replace content with edit form
            content.innerHTML = '';
            content.appendChild(editForm);
            
            // Add event listeners for save and cancel
            editForm.querySelector('.save-edit').addEventListener('click', async () => {
                const newWebsite = document.getElementById(`edit-website-${password.id}`).value;
                const newUsername = document.getElementById(`edit-username-${password.id}`).value;
                const newPassword = document.getElementById(`edit-password-${password.id}`).value;
                
                if (!newWebsite || !newUsername || !newPassword) {
                    showPopup('Save Error', 'Please fill in all fields.');
                    return;
                }
                
                try {
                    const response = await fetch(`${API_URL}/passwords/update`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${await chrome.storage.local.get('token').then(data => data.token)}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            website: newWebsite,
                            username: newUsername,
                            password: newPassword,
                        }),
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        loadPasswords(); // Refresh the list
                        showPopup('Password Updated', 'Password updated successfully!');
                    } else {
                        showPopup('Update Error', data.detail || 'Unknown error');
                    }
                } catch (error) {
                    console.error('Update password error:', error);
                    showPopup('Update Error', 'An error occurred while updating the password.');
                }
            });
            
            editForm.querySelector('.cancel-edit').addEventListener('click', () => {
                loadPasswords(); // Refresh to show original state
            });
        });
        
        div.appendChild(header);
        div.appendChild(content);
        passwordList.appendChild(div);
    });
}

async function copyPassword(passwordId) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/passwords/${passwordId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            await navigator.clipboard.writeText(data.password);
            showPopup('Password Copied', 'Password has been copied to clipboard!');
        } else {
            const errorData = await response.json();
            showPopup('Copy Error', errorData.detail || 'Unknown error');
        }
    } catch (error) {
        console.error('Copy password error:', error);
        showPopup('Copy Error', 'An error occurred while copying the password.');
    }
}

async function deletePassword(passwordId) {
    const { token } = await chrome.storage.local.get('token');
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/passwords/${passwordId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            loadPasswords();
            showPopup('Password Deleted', 'Password has been deleted successfully!', 'success');
        } else {
            const errorData = await response.json();
            showPopup('Delete Failed', errorData.detail || 'Failed to delete password.', 'error');
        }
    } catch (error) {
        console.error('Delete password error:', error);
        showPopup('Delete Error', 'An error occurred while deleting the password.', 'error');
    }
}

// Function to show popup message
function showPopup(title, message, type = 'success') {
    // Remove any existing popups first
    const existingPopups = document.querySelectorAll('.password-manager-popup');
    existingPopups.forEach(popup => popup.remove());

    const popup = document.createElement('div');
    popup.className = `password-manager-popup ${type}`;
    popup.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 2147483647;
        width: calc(100% - 40px);
        max-width: none;
        animation: slideIn 0.3s ease-out;
        border-left: 4px solid ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
        box-sizing: border-box;
    `;

    popup.innerHTML = `
        <div style="color: #333; font-size: 14px; word-wrap: break-word;">
            ${message}
        </div>
    `;

    // Add styles for animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(popup);

    // Auto close after 3 seconds
    setTimeout(() => {
        if (popup.parentNode) {
            popup.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => popup.remove(), 300);
        }
    }, 3000);
} 