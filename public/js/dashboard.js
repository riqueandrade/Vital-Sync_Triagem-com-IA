document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const socket = io();
    const userId = getUserIdFromToken(token);
    socket.emit('user online', userId);

    try {
        await loadUserInfo(token);
        await loadUpcomingAppointments(token);
        await loadPendingRatings(token);
        await loadMedicalHistory(token);
        await loadNotifications(token);
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        alert('Erro ao carregar dados do dashboard. Por favor, tente novamente mais tarde.');
    }

    setupEventListeners(token);
});

async function loadUserInfo(token) {
    const response = await fetch('/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const userData = await response.json();
    if (response.ok) {
        document.getElementById('userInfo').innerHTML = `
            <p>Nome: ${userData.name}</p>
            <p>Email: ${userData.email}</p>
            <p>Tipo: ${userData.role === 'patient' ? 'Paciente' : 'Médico'}</p>
        `;
    } else {
        throw new Error(userData.message || 'Erro ao buscar informações do usuário');
    }
}

async function loadUpcomingAppointments(token) {
    const response = await fetch('/api/appointments/upcoming', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const appointments = await response.json();
    if (response.ok) {
        const appointmentsList = document.getElementById('upcomingAppointmentsList');
        appointmentsList.innerHTML = appointments.map(appointment => `
            <li class="list-group-item">
                Data: ${new Date(appointment.date).toLocaleString()}
                <br>${appointment.doctorName ? 'Médico: ' + appointment.doctorName : 'Paciente: ' + appointment.patientName}
                <br><a href="/chat.html?appointmentId=${appointment.id}" class="btn btn-sm btn-primary mt-2">Iniciar Chat</a>
            </li>
        `).join('');
    } else {
        throw new Error('Erro ao buscar próximas consultas');
    }
}

async function loadPendingRatings(token) {
    const response = await fetch('/api/appointments/pending-ratings', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const pendingRatings = await response.json();
    if (response.ok) {
        const pendingRatingsList = document.getElementById('pendingRatingsList');
        pendingRatingsList.innerHTML = pendingRatings.map(appointment => `
            <li class="list-group-item">
                Data: ${new Date(appointment.date).toLocaleString()}
                <br>Médico: ${appointment.doctorName}
                <br><a href="/rate-appointment.html?appointmentId=${appointment.id}" class="btn btn-sm btn-secondary mt-2">Avaliar Consulta</a>
            </li>
        `).join('');
    } else {
        throw new Error('Erro ao buscar consultas pendentes de avaliação');
    }
}

async function loadMedicalHistory(token) {
    const response = await fetch('/api/medical-history/user', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const history = await response.json();
    if (response.ok) {
        const medicalHistoryAccordion = document.getElementById('medicalHistoryAccordion');
        medicalHistoryAccordion.innerHTML = history.map((record, index) => `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                        ${record.condition} - ${new Date(record.diagnosis_date).toLocaleDateString()}
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" data-bs-parent="#medicalHistoryAccordion">
                    <div class="accordion-body">
                        <p><strong>Condição:</strong> ${record.condition}</p>
                        <p><strong>Data do Diagnóstico:</strong> ${new Date(record.diagnosis_date).toLocaleDateString()}</p>
                        <p><strong>Tratamento:</strong> ${record.treatment}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        throw new Error('Erro ao buscar histórico médico');
    }
}

async function loadNotifications(token) {
    const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const notifications = await response.json();
    if (response.ok) {
        const notificationsList = document.getElementById('notificationsList');
        const notificationCount = document.getElementById('notificationCount');
        
        notificationCount.textContent = notifications.filter(n => !n.is_read).length;

        notificationsList.innerHTML = notifications.map(notification => `
            <li data-id="${notification.id}" class="${notification.is_read ? 'read' : 'unread'}">
                ${notification.message}
                <button class="btn btn-sm btn-outline-primary markAsRead">Marcar como lida</button>
            </li>
        `).join('');
    } else {
        throw new Error('Erro ao carregar notificações');
    }
}

function setupEventListeners(token) {
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    document.getElementById('notifications').addEventListener('click', (e) => {
        e.preventDefault();
        const notificationsPanel = document.getElementById('notificationsPanel');
        notificationsPanel.style.display = notificationsPanel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('notificationsList').addEventListener('click', async (e) => {
        if (e.target.classList.contains('markAsRead')) {
            const notificationId = e.target.closest('li').dataset.id;
            await markNotificationAsRead(notificationId, token);
            await loadNotifications(token);
        }
    });
}

async function markNotificationAsRead(notificationId, token) {
    try {
        await fetch(`/api/notifications/${notificationId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
    }
}

function getUserIdFromToken(token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
}