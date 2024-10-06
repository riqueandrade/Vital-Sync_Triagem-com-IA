document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Carregar lista de médicos
    try {
        const response = await fetch('/api/auth/doctors', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const doctors = await response.json();

        const doctorSelect = document.getElementById('doctorId');
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = doctor.name;
            doctorSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar lista de médicos:', error);
        alert('Erro ao carregar lista de médicos');
    }

    // Lidar com o envio do formulário
    document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const doctorId = document.getElementById('doctorId').value;
        const appointmentDate = document.getElementById('appointmentDate').value;
        const notes = document.getElementById('notes').value;

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_id: doctorId,
                    date: appointmentDate,
                    notes: notes
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Consulta agendada com sucesso!');
                window.location.href = '/dashboard.html';
            } else {
                throw new Error(data.message || 'Erro ao agendar consulta');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    });

    // Adicionar evento de logout
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });
});