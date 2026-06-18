// ========================
// Caporales San Gabriel – Arriendo de Trajes
// Supabase dashboard v2.1
// ========================

// 1) CONFIGURACIÓN
const SUPABASE_URL = 'https://hqcwdrdcznzpjexivlsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxY3dkcmRjem56cGpleGl2bHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTA3NjgsImV4cCI6MjA5NzM2Njc2OH0.Q7e53_I7lhyRHxuftUjSBzb7GNMeTFyL5iY0LuCk8gk';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) ELEMENTOS DEL DOM
const authSection = document.getElementById('auth-section');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const authToggle = document.getElementById('auth-toggle');
const authName = document.getElementById('auth-name');
const authNameLabel = document.getElementById('auth-name-label');
const userBar = document.getElementById('user-bar');
const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const adminBtn = document.getElementById('admin-btn');
const addSection = document.getElementById('add-section');
const addForm = document.getElementById('add-form');
const costumesBody = document.getElementById('costumes-body');
const eventsSection = document.getElementById('events-section');

const filterEvent = document.getElementById('filter-event');
const filterYear = document.getElementById('filter-year');
const filterSize = document.getElementById('filter-size');
const filterBoot = document.getElementById('filter-boot');
const filterStatus = document.getElementById('filter-status');

const rentModal = document.getElementById('rent-modal');
const rentForm = document.getElementById('rent-form');
const rentClose = document.getElementById('rent-close');
const voucherModal = document.getElementById('voucher-modal');
const voucherClose = document.getElementById('voucher-close');
const voucherPreview = document.getElementById('voucher-preview');

const adminModal = document.getElementById('admin-modal');
const adminClose = document.getElementById('admin-close');
const adminAddEventForm = document.getElementById('admin-add-event-form');

let currentUser = null;
let userProfile = null;
let isAdmin = false;
let eventsList = [];

// 3) INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
  createToastContainer();
  await loadEvents();
  await loadSession();
  setupEventListeners();
  await loadCostumes();
});

function createToastContainer() {
  if (!document.getElementById('toast-container')) {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function setupEventListeners() {
  authForm.addEventListener('submit', handleAuth);
  authToggle.addEventListener('click', toggleAuthMode);
  logoutBtn.addEventListener('click', handleLogout);
  addForm.addEventListener('submit', handleAddCostume);
  adminBtn.addEventListener('click', () => adminModal.classList.remove('hidden'));

  [filterEvent, filterYear, filterSize, filterBoot, filterStatus].forEach(el => {
    el.addEventListener('change', loadCostumes);
  });

  rentForm.addEventListener('submit', handleRentSubmit);
  rentClose.addEventListener('click', () => rentModal.classList.add('hidden'));
  voucherClose.addEventListener('click', () => voucherModal.classList.add('hidden'));
  adminClose.addEventListener('click', () => adminModal.classList.add('hidden'));
  adminAddEventForm.addEventListener('submit', handleAddEvent);

  window.addEventListener('click', (e) => {
    if (e.target === rentModal) rentModal.classList.add('hidden');
    if (e.target === voucherModal) voucherModal.classList.add('hidden');
    if (e.target === adminModal) adminModal.classList.add('hidden');
  });
}

let isRegistering = false;
function toggleAuthMode() {
  isRegistering = !isRegistering;
  if (isRegistering) {
    authTitle.textContent = 'Crear cuenta';
    authSubmit.textContent = 'Registrarse';
    authToggle.textContent = '¿Ya tienes cuenta? Inicia sesión';
    authName.classList.remove('hidden');
    authNameLabel.classList.remove('hidden');
    authName.required = true;
  } else {
    authTitle.textContent = 'Iniciar sesión';
    authSubmit.textContent = 'Iniciar sesión';
    authToggle.textContent = '¿No tienes cuenta? Regístrate';
    authName.classList.add('hidden');
    authNameLabel.classList.add('hidden');
    authName.required = false;
  }
}

// 4) CARGAR EVENTOS
async function loadEvents() {
  const { data, error } = await supabaseClient
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error cargando eventos:', error);
    return;
  }

  eventsList = data || [];
  populateEventSelects();
  renderEventsCards();
}

function populateEventSelects() {
  // Filtro de eventos
  filterEvent.innerHTML = '<option value="">Todos los eventos</option>';
  eventsList.forEach(event => {
    filterEvent.innerHTML += `<option value="${event.id}">${event.name}</option>`;
  });

  // Select de evento al publicar traje
  const costumeEvent = document.getElementById('costume-event');
  if (costumeEvent) {
    costumeEvent.innerHTML = '<option value="">Selecciona evento</option>';
    eventsList.forEach(event => {
      costumeEvent.innerHTML += `<option value="${event.id}">${event.name} (${formatDate(event.event_date)})</option>`;
    });
  }

  // Select de evento al arrendar
  const rentEvent = document.getElementById('rent-event');
  if (rentEvent) {
    rentEvent.innerHTML = '<option value="">Selecciona evento</option>';
    eventsList.forEach(event => {
      rentEvent.innerHTML += `<option value="${event.name}">${event.name} (${formatDate(event.event_date)})</option>`;
    });
  }
}

function renderEventsCards() {
  eventsSection.innerHTML = '';
  eventsList.forEach(event => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <strong>${event.name}</strong>
      <span>${formatDate(event.event_date)}</span>
      ${event.description ? `<small>${event.description}</small>` : ''}
    `;
    eventsSection.appendChild(card);
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// 5) SESIÓN Y PERFIL
async function loadSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    await setUser(session.user);
  } else {
    showPublicUI();
  }
}

async function setUser(user) {
  currentUser = user;
  
  // Cargar perfil
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  userProfile = profile || { full_name: user.email };

  // Verificar si es admin (manejo seguro de error)
  try {
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleError && roleData) {
      isAdmin = roleData.role === 'admin';
    } else {
      isAdmin = false;
    }
  } catch (e) {
    console.log('Error verificando rol (posiblemente tabla no existe):', e.message);
    isAdmin = false;
  }
  
  showLoggedUI();
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (isRegistering) {
    const fullName = authName.value.trim();
    if (!fullName) return showToast('Ingresa tu nombre completo.', 'error');

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) return showToast('Error al registrarse: ' + error.message, 'error');

    await supabaseClient.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      email: email
    });

    showToast('Cuenta creada. Ya puedes usar el dashboard.', 'success');
    await setUser(data.user);
  } else {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return showToast('Error al iniciar sesión: ' + error.message, 'error');
    showToast('Sesión iniciada.', 'success');
    await setUser(data.user);
  }

  authForm.reset();
  await loadCostumes();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  userProfile = null;
  isAdmin = false;
  showPublicUI();
  showToast('Sesión cerrada.', 'info');
  await loadCostumes();
}

function showPublicUI() {
  authSection.classList.remove('hidden');
  userBar.classList.add('hidden');
  addSection.classList.add('hidden');
  adminBtn.classList.add('hidden');
}

function showLoggedUI() {
  authSection.classList.add('hidden');
  userBar.classList.remove('hidden');
  addSection.classList.remove('hidden');
  userGreeting.textContent = `Hola, ${userProfile?.full_name || currentUser.email}${isAdmin ? ' 👑' : ''}`;
  
  if (isAdmin) {
    adminBtn.classList.remove('hidden');
  } else {
    adminBtn.classList.add('hidden');
  }
}

// 6) CARGAR TRAJES
async function loadCostumes() {
  costumesBody.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';

  let query = supabaseClient
    .from('costumes')
    .select('*, owner:profiles(id, full_name, email), event:events(id, name, event_date), renter:rentals(*)')
    .order('created_at', { ascending: false });

  const fe = filterEvent.value;
  const fy = filterYear.value;
  const fs = filterSize.value;
  const fb = filterBoot.value;
  const fst = filterStatus.value;

  if (fe) query = query.eq('event_id', fe);
  if (fy) query = query.eq('year', fy);
  if (fs) query = query.eq('size', fs);
  if (fb) query = query.eq('boot_size', fb);
  if (fst) query = query.eq('status', fst);

  const { data, error } = await query;
  if (error) {
    costumesBody.innerHTML = `<tr><td colspan="8" class="empty">Error al cargar: ${error.message}</td></tr>`;
    console.error('Error cargando trajes:', error);
    return;
  }

  if (!data || data.length === 0) {
    costumesBody.innerHTML = '<tr><td colspan="8" class="empty">No hay trajes publicados aún.</td></tr>';
    return;
  }

  renderCostumes(data);
}

function renderCostumes(costumes) {
  costumesBody.innerHTML = '';

  costumes.forEach(c => {
    const isOwner = currentUser && c.owner_id === currentUser.id;
    const rental = Array.isArray(c.renter) ? c.renter[0] : c.renter;
    
    const eventName = c.event?.name || 'Sin evento';
    const eventDate = c.event?.event_date ? formatDate(c.event.event_date) : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${eventName}</strong>
        ${eventDate ? `<br><small>${eventDate}</small>` : ''}
      </td>
      <td>${c.year}</td>
      <td>${c.size}</td>
      <td>${c.boot_size}</td>
      <td>$${Number(c.price).toLocaleString('es-CL')}</td>
      <td>
        ${c.owner?.full_name || 'Sin nombre'}
        <br><small>${c.owner?.email || ''}</small>
        <br><small class="bank-data">${escapeHtml(c.bank_info || '')}</small>
      </td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td class="actions-cell">
        ${renderActions(c, isOwner, rental)}
      </td>
    `;
    costumesBody.appendChild(tr);
  });
}

function renderActions(costume, isOwner, rental) {
  let html = '';

  // Botón Arrendar
  if (costume.status === 'disponible') {
    if (currentUser) {
      html += `<button class="btn btn-primary btn-small" onclick="openRentModal('${costume.id}')" style="margin-right:8px;">Arrendar</button>`;
    } else {
      html += `<small>Inicia sesión para arrendar</small>`;
    }
  }

  // Botones del dueño (Confirmar, Ver comprobante)
  if (isOwner && costume.status !== 'disponible' && rental) {
    html += `<button class="btn btn-success btn-small" onclick="confirmRental('${rental.id}')" style="margin-right:8px;">Confirmar arriendo</button>`;
    html += `<button class="btn btn-ghost btn-small" onclick="viewVoucher('${rental.voucher_path}')" style="margin-right:8px;">Ver comprobante</button>`;
    html += `<div class="renter-info">
      <strong>${escapeHtml(rental.first_name + ' ' + rental.last_name)}</strong><br>
      RUT: ${escapeHtml(rental.rut)}<br>
      Tel: ${escapeHtml(rental.phone)}<br>
      ${escapeHtml(rental.email)}
    </div>`;
  }

  // Botón Eliminar (dueño, solo disponible)
  if (isOwner && costume.status === 'disponible') {
    html += `<button class="btn btn-danger btn-small" onclick="deleteCostume('${costume.id}')" style="margin-top:8px;">Eliminar</button>`;
  }

  return html;
}

// 7) PUBLICAR TRAJE
async function handleAddCostume(e) {
  e.preventDefault();
  if (!currentUser) return showToast('Debes iniciar sesión.', 'error');

  const eventId = document.getElementById('costume-event').value;
  // Permitir publicar sin evento (queda disponible para todos)
  
  const costume = {
    owner_id: currentUser.id,
    event_id: eventId || null,
    year: document.getElementById('costume-year').value,
    size: document.getElementById('costume-size').value,
    boot_size: document.getElementById('costume-boot').value,
    price: Number(document.getElementById('costume-price').value),
    bank_info: document.getElementById('costume-bank').value.trim(),
    status: 'disponible'
  };

  const { error } = await supabaseClient.from('costumes').insert(costume);
  if (error) return showToast('Error al publicar: ' + error.message, 'error');

  showToast('Traje publicado correctamente.', 'success');
  addForm.reset();
  await loadCostumes();
}

// 8) ARRENDAR
window.openRentModal = function(costumeId) {
  if (!currentUser) return showToast('Debes iniciar sesión para arrendar.', 'error');
  document.getElementById('rent-costume-id').value = costumeId;
  document.getElementById('rent-email').value = currentUser.email || '';
  rentModal.classList.remove('hidden');
};

async function handleRentSubmit(e) {
  e.preventDefault();
  const costumeId = document.getElementById('rent-costume-id').value;
  const fileInput = document.getElementById('rent-voucher');
  const file = fileInput.files[0];
  if (!file) return showToast('Debes adjuntar el comprobante.', 'error');

  const firstName = document.getElementById('rent-firstname').value.trim();
  const lastName = document.getElementById('rent-lastname').value.trim();
  const rut = document.getElementById('rent-rut').value.trim();
  const phone = document.getElementById('rent-phone').value.trim();
  const email = document.getElementById('rent-email').value.trim();
  const eventName = document.getElementById('rent-event').value;

  if (!eventName) return showToast('Selecciona un evento.', 'error');

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `vouchers/${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('vouchers')
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) return showToast('Error al subir comprobante: ' + uploadError.message, 'error');

  const rental = {
    costume_id: costumeId,
    renter_id: currentUser.id,
    first_name: firstName,
    last_name: lastName,
    rut,
    phone,
    email,
    event_name: eventName,
    voucher_path: filePath,
    status: 'reservado'
  };

  const { error: rentalError } = await supabaseClient.from('rentals').insert(rental);
  if (rentalError) return showToast('Error al crear solicitud: ' + rentalError.message, 'error');

  const { error: updateError } = await supabaseClient
    .from('costumes')
    .update({ status: 'reservado' })
    .eq('id', costumeId);

  if (updateError) return showToast('Error al actualizar traje: ' + updateError.message, 'error');

  showToast('Solicitud enviada. El dueño revisará el comprobante.', 'success');
  rentModal.classList.add('hidden');
  rentForm.reset();
  await loadCostumes();
}

// 9) CONFIRMAR ARRIENDO
window.confirmRental = async function(rentalId) {
  if (!currentUser) return;

  const { data: rental, error } = await supabaseClient
    .from('rentals')
    .select('costume_id, costume:costumes(owner_id, status)')
    .eq('id', rentalId)
    .single();

  if (error || !rental) return showToast('No se encontró la solicitud.', 'error');
  if (rental.costume.owner_id !== currentUser.id) return showToast('No puedes confirmar este arriendo.', 'error');

  const { error: updRental } = await supabaseClient
    .from('rentals')
    .update({ status: 'arrendado' })
    .eq('id', rentalId);

  if (updRental) return showToast('Error al confirmar: ' + updRental.message, 'error');

  const { error: updCostume } = await supabaseClient
    .from('costumes')
    .update({ status: 'arrendado' })
    .eq('id', rental.costume_id);

  if (updCostume) return showToast('Error al actualizar traje: ' + updCostume.message, 'error');

  showToast('Arriendo confirmado.', 'success');
  await loadCostumes();
};

// 10) VER COMPROBANTE
window.viewVoucher = async function(path) {
  if (!path) return showToast('No hay comprobante adjunto.', 'error');

  const { data, error } = await supabaseClient.storage.from('vouchers').createSignedUrl(path, 300);
  if (error) return showToast('Error al cargar comprobante: ' + error.message, 'error');

  const isPdf = path.toLowerCase().endsWith('.pdf');
  voucherPreview.innerHTML = isPdf
    ? `<embed src="${data.signedUrl}" type="application/pdf" width="100%" height="500px" />`
    : `<img src="${data.signedUrl}" alt="Comprobante" style="max-width:100%; border-radius:8px;" />`;

  voucherModal.classList.remove('hidden');
};

// 11) ELIMINAR TRAJE
window.deleteCostume = async function(costumeId) {
  if (!confirm('¿Seguro que quieres eliminar este traje?')) return;

  const { error } = await supabaseClient.from('costumes').delete().eq('id', costumeId);
  if (error) return showToast('Error al eliminar: ' + error.message, 'error');

  showToast('Traje eliminado.', 'info');
  await loadCostumes();
};

// 12) ADMIN - AGREGAR EVENTO
async function handleAddEvent(e) {
  e.preventDefault();
  if (!isAdmin) return showToast('No tienes permisos de administrador.', 'error');

  const name = document.getElementById('event-name').value.trim();
  const eventDate = document.getElementById('event-date').value;
  const description = document.getElementById('event-description').value.trim();

  if (!name || !eventDate) return showToast('Nombre y fecha son requeridos.', 'error');

  const { error } = await supabaseClient
    .from('events')
    .insert({
      name,
      event_date: eventDate,
      description,
      created_by: currentUser.id
    });

  if (error) return showToast('Error al crear evento: ' + error.message, 'error');

  showToast('Evento creado exitosamente.', 'success');
  document.getElementById('event-name').value = '';
  document.getElementById('event-date').value = '';
  document.getElementById('event-description').value = '';
  
  await loadEvents();
  await loadCostumes();
  loadAdminEventsList();
}

async function loadAdminEventsList() {
  const { data, error } = await supabaseClient
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) return;

  const listContainer = document.getElementById('admin-events-list');
  if (!listContainer) return;

  listContainer.innerHTML = data.map(event => `
    <div class="admin-event-item">
      <div>
        <strong>${event.name}</strong>
        <br><small>${formatDate(event.event_date)}</small>
        ${event.description ? `<br><small>${event.description}</small>` : ''}
      </div>
      <button class="btn btn-small btn-ghost" onclick="toggleEventStatus('${event.id}', ${event.is_active})">
        ${event.is_active ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  `).join('');
}

window.toggleEventStatus = async function(eventId, currentStatus) {
  if (!isAdmin) return showToast('No tienes permisos.', 'error');

  const { error } = await supabaseClient
    .from('events')
    .update({ is_active: !currentStatus })
    .eq('id', eventId);

  if (error) return showToast('Error al actualizar evento: ' + error.message, 'error');

  showToast(`Evento ${currentStatus ? 'desactivado' : 'activado'}.`, 'success');
  await loadEvents();
  await loadCostumes();
  loadAdminEventsList();
};

// Cargar lista cuando se abre el modal de admin
const adminModalElement = document.getElementById('admin-modal');
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.target.id === 'admin-modal' && !mutation.target.classList.contains('hidden')) {
      loadAdminEventsList();
    }
  });
});

if (adminModalElement) {
  observer.observe(adminModalElement, { attributes: true, attributeFilter: ['class'] });
}

// 13) UTILIDADES
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
