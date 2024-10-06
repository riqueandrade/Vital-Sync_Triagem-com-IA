document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        // Buscar informações do usuário
        const userResponse = await fetch('/api/auth/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const userData = await userResponse.json();

        if (userResponse.ok) {
            document.getElementById('userInfo').innerHTML = `
                <p>Nome: ${userData.name}</p>
                <p>Email: ${userData.email}</p>
                <p>Tipo: ${userData.role === 'patient' ? 'Paciente' : 'Médico'}</p>
            `;
        } else {
            throw new Error(userData.message || 'Erro ao buscar informações do usuário');
        }

        // Buscar consultas do usuário
        const appointmentsResponse = await fetch('/api/appointments/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const appointmentsData = await appointmentsResponse.json();

        if (appointmentsResponse.ok) {
            const appointmentsList = appointmentsData.map(appointment => `
                <li>
                    Data: ${new Date(appointment.date).toLocaleString()}
                    Status: ${appointment.status}
                    ${appointment.notes ? `Observações: ${appointment.notes}` : ''}
                </li>
            `).join('');
            document.getElementById('appointments').innerHTML += `
                <ul>${appointmentsList}</ul>
            `;
        } else {
            throw new Error(appointmentsData.message || 'Erro ao buscar consultas');
        }

        // Buscar histórico médico do usuário (apenas para pacientes)
        if (userData.role === 'patient') {
            const historyResponse = await fetch('/api/medical-history/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const historyData = await historyResponse.json();

            if (historyResponse.ok) {
                const historyList = historyData.map(record => `
                    <li>
                        Condição: ${record.condition}
                        Data do Diagnóstico: ${new Date(record.diagnosis_date).toLocaleDateString()}
                        Tratamento: ${record.treatment}
                    </li>
                `).join('');
                document.getElementById('medicalHistory').innerHTML += `
                    <ul>${historyList}</ul>
                `;
            } else {
                throw new Error(historyData.message || 'Erro ao buscar histórico médico');
            }
        } else {
            document.getElementById('medicalHistory').style.display = 'none';
        }
    } catch (error) {
        console.error('Erro:', error);
        alert(error.message);
    }

    // Adicionar evento de logout
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });
});