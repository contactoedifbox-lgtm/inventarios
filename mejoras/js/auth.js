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
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('current-user').textContent = currentUser?.email || 'Cliente - MEJORAS';
}
