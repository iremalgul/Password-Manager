// Function to show custom popup message
function showPopup(title, message, type = 'success', onConfirm = null) {
    // Remove any existing popups first
    const existingPopups = document.querySelectorAll('.password-manager-popup-overlay');
    existingPopups.forEach(popup => popup.remove());

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'password-manager-popup-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '2147483647' // Maximum z-index value
    });

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'password-manager-popup';
    Object.assign(popup.style, {
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '300px',
        maxWidth: '400px',
        position: 'relative',
        animation: 'fadeIn 0.3s ease-out'
    });
    
    // Get the extension icon
    const iconUrl = chrome.runtime.getURL('icons/icon.png');
    
    // Create popup content
    const content = document.createElement('div');
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.marginBottom = '15px';
    header.style.gap = '10px';
    
    const icon = document.createElement('img');
    icon.src = iconUrl;
    icon.alt = 'Password Manager';
    icon.style.width = '24px';
    icon.style.height = '24px';
    
    const titleDiv = document.createElement('div');
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.fontSize = '18px';
    titleDiv.textContent = title;
    
    header.appendChild(icon);
    header.appendChild(titleDiv);
    
    const messageP = document.createElement('p');
    messageP.style.margin = '0 0 20px 0';
    messageP.style.color = '#666';
    messageP.textContent = message;
    
    content.appendChild(header);
    content.appendChild(messageP);
    
    if (onConfirm) {
        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '10px';
        buttonGroup.style.justifyContent = 'flex-end';
        
        const confirmButton = document.createElement('button');
        Object.assign(confirmButton.style, {
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
        });
        confirmButton.textContent = 'Yes';
        
        const cancelButton = document.createElement('button');
        Object.assign(cancelButton.style, {
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
        });
        cancelButton.textContent = 'No';
        
        buttonGroup.appendChild(confirmButton);
        buttonGroup.appendChild(cancelButton);
        content.appendChild(buttonGroup);
        
        // Function to handle popup removal
        const removePopup = (result) => {
            if (!overlay.parentNode) return;
            overlay.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                    onConfirm(result);
                }
            }, 300);
        };
        
        // Add click handlers
        confirmButton.addEventListener('click', () => removePopup(true));
        cancelButton.addEventListener('click', () => removePopup(false));
        
        // Prevent closing when clicking the overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                e.stopPropagation();
            }
        });
    } else {
        const closeButton = document.createElement('button');
        Object.assign(closeButton.style, {
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: '#666'
        });
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => {
            overlay.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => overlay.remove(), 300);
        });
        popup.appendChild(closeButton);
        
        // Auto close after 5 seconds only for non-confirmation popups
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.style.animation = 'fadeOut 0.3s ease-in forwards';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 5000);
    }
    
    // Add styles for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    popup.appendChild(content);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// Function to detect login forms
function detectLoginForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        // Skip if we've already processed this form
        if (form.dataset.passwordManagerProcessed === 'true') {
            return;
        }

        const inputs = form.querySelectorAll('input');
        const hasUsername = Array.from(inputs).some(input => 
            input.type === 'text' || input.type === 'email' || input.name.toLowerCase().includes('username') || input.id.toLowerCase().includes('username')
        );
        const hasPassword = Array.from(inputs).some(input => 
            input.type === 'password'
        );

        if (hasUsername && hasPassword) {
            // Create autofill button
            const autofillButton = document.createElement('button');
            Object.assign(autofillButton.style, {
                position: 'absolute',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                zIndex: '2147483647',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                left: '50%',
                transform: 'translateX(-50%)',
                top: '-40px',
                type: 'button' // Prevent form submission
            });
            autofillButton.textContent = 'Autofill';
            autofillButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default button behavior
                e.stopPropagation(); // Stop event bubbling
                handleAutofill(window.location.hostname);
            });

            // Make sure the form has relative positioning
            if (getComputedStyle(form).position === 'static') {
                form.style.position = 'relative';
            }

            // Add button to the form
            form.insertBefore(autofillButton, form.firstChild);

            // Add submit event listener to detect successful login
            form.addEventListener('submit', async (e) => {
                // Get the form data before submission
                const formData = new FormData(form);
                let username = '';
                let password = '';

                inputs.forEach(input => {
                    if (input.type === 'text' || input.type === 'email' || input.name.toLowerCase().includes('username') || input.id.toLowerCase().includes('username')) {
                        username = input.value;
                    } else if (input.type === 'password') {
                        password = input.value;
                    }
                });

                if (username && password) {
                    // Store login info in sessionStorage
                    sessionStorage.setItem('passwordManagerPendingLogin', JSON.stringify({
                        website: window.location.hostname,
                        username: username,
                        password: password,
                        timestamp: Date.now()
                    }));
                }
            });

            // Mark the form as processed
            form.dataset.passwordManagerProcessed = 'true';
        }
    });
}

// Function to handle autofill
async function handleAutofill(website) {
    try {
        const { token, username } = await chrome.storage.local.get(['token', 'username']);
        console.log('Autofill - Token:', token, 'Username:', username); // Debug log

        if (!token) {
            showPopup('Login Required', 'Please log in to the password manager extension to use autofill.', 'warning');
            return;
        }

        const response = await chrome.runtime.sendMessage({
            action: 'getPassword',
            data: { website }
        });

        console.log('Autofill response:', response); // Debug log

        if (response && response.data && response.data.password) {
            // Find all forms on the page
            const forms = document.querySelectorAll('form');
            let filled = false;

            forms.forEach(form => {
                const inputs = form.querySelectorAll('input');
                let usernameField = null;
                let passwordField = null;

                // Find username and password fields
                inputs.forEach(input => {
                    if (input.type === 'text' || input.type === 'email' || 
                        input.name.toLowerCase().includes('username') || 
                        input.id.toLowerCase().includes('username') ||
                        input.placeholder.toLowerCase().includes('username')) {
                        usernameField = input;
                    } else if (input.type === 'password' || 
                             input.name.toLowerCase().includes('password') || 
                             input.id.toLowerCase().includes('password') ||
                             input.placeholder.toLowerCase().includes('password')) {
                        passwordField = input;
                    }
                });

                // If both fields are found, fill them
                if (usernameField && passwordField) {
                    usernameField.value = response.data.username;
                    passwordField.value = response.data.password;
                    
                    // Trigger events
                    usernameField.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    filled = true;
                }
            });

            if (filled) {
                showPopup('Autofill Success', 'Your login information has been filled in.', 'success');
            } else {
                showPopup('Autofill Error', 'Could not find login fields on this page.', 'error');
            }
        } else {
            showPopup('No Password Found', 'No saved password found for this website.', 'warning');
        }
    } catch (error) {
        console.error('Autofill error:', error);
        showPopup('Autofill Error', 'An error occurred while trying to autofill.', 'error');
    }
}

// Function to check for pending login
function checkPendingLogin() {
    const pendingLogin = sessionStorage.getItem('passwordManagerPendingLogin');
    if (pendingLogin) {
        const loginData = JSON.parse(pendingLogin);
        // Only show popup if the login was recent (within last 5 seconds)
        if (Date.now() - loginData.timestamp < 5000) {
            // First check if we already have a password for this website and username
            chrome.runtime.sendMessage({
                action: 'getPassword',
                data: { 
                    website: loginData.website,
                    username: loginData.username
                }
            }, response => {
                if (response.success && response.data) {
                    // If the password is different from the saved one, show update prompt
                    if (response.data.password !== loginData.password) {
                        showPopup(
                            'Update Password',
                            'A password already exists for this username. Would you like to update it?',
                            'warning',
                            (confirmed) => {
                                if (confirmed) {
                                    // Send update request
                                    chrome.runtime.sendMessage({
                                        action: 'updatePassword',
                                        data: {
                                            website: loginData.website,
                                            username: loginData.username,
                                            password: loginData.password
                                        }
                                    }, updateResponse => {
                                        if (updateResponse.success) {
                                            showPopup(
                                                'Password Updated',
                                                'Your password has been updated successfully.',
                                                'success'
                                            );
                                        } else {
                                            showPopup(
                                                'Update Failed',
                                                updateResponse.error || 'Failed to update password. Please try again.',
                                                'error'
                                            );
                                        }
                                    });
                                }
                            }
                        );
                    }
                    // If the password is the same, do nothing
                } else {
                    // No existing password for this username, show save prompt
                    showPopup(
                        'Save Password',
                        'Would you like to save this password?',
                        'warning',
                        (confirmed) => {
                            if (confirmed) {
                                // Send message to background script to save password
                                chrome.runtime.sendMessage({
                                    action: 'savePassword',
                                    data: {
                                        website: loginData.website,
                                        username: loginData.username,
                                        password: loginData.password
                                    }
                                }, response => {
                                    if (response.success) {
                                        showPopup(
                                            'Password Saved',
                                            'Your password has been saved successfully.',
                                            'success'
                                        );
                                    } else {
                                        showPopup(
                                            'Save Failed',
                                            response.error || 'Failed to save password. Please make sure you are logged in to the extension.',
                                            'error'
                                        );
                                    }
                                });
                            }
                        }
                    );
                }
            });
        }
        // Clear the pending login data
        sessionStorage.removeItem('passwordManagerPendingLogin');
    }
}

// Add styles to the page
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = chrome.runtime.getURL('popup-styles.css');
document.head.appendChild(style);

// Run form detection when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check for pending login first
    checkPendingLogin();
    // Then detect forms
    detectLoginForms();
});

// Run form detection when DOM changes
const observer = new MutationObserver(() => {
    detectLoginForms();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
}); 