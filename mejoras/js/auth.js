async function checkAuth() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
        cargarDatos();
    } else {
        showLogin();
    }
}

async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
        showLoginError('Por favor ingresa email y contraseña');
        return;
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        console.error('Error de login:', error);
        showLoginError('Credenciales incorrectas');
        return;
    }
    currentUser = data.user;
    showApp();
    cargarDatos();
}

async function logoutUser() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    showLogin();
}

function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function showApp() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const currentUserElement = document.getElementById('current-user');
    const userEmailElement = document.getElementById('user-email');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (currentUserElement) currentUserElement.textContent = currentUser?.email || 'Cliente - MEJORAS';
    if (userEmailElement) userEmailElement.textContent = currentUser?.email || 'Usuario';
}
