document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const doctorSelect = document.getElementById('doctorId');
    const dateInput = document.getElementById('appointmentDate');
    const timeSelect = document.getElementById('appointmentTime');
    const appointmentForm = document.getElementById('appointmentForm');

    // Carregar lista de médicos
    try {
        const response = await fetch('/api/doctors', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const doctors = await response.json();
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

    // Atualizar horários disponíveis quando a data ou médico for alterado
    async function updateAvailableSlots() {
        const doctorId = doctorSelect.value;
        const date = dateInput.value;
        if (doctorId && date) {
            try {
                const response = await fetch(`/api/appointments/available-slots/${doctorId}?date=${date}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const availableSlots = await response.json();
                timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
                availableSlots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot;
                    option.textContent = slot;
                    timeSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Erro ao buscar horários disponíveis:', error);
                alert('Erro ao buscar horários disponíveis');
            }
        }
    }

    doctorSelect.addEventListener('change', updateAvailableSlots);
    dateInput.addEventListener('change', updateAvailableSlots);

    // Lidar com o envio do formulário
    appointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const doctorId = doctorSelect.value;
        const date = dateInput.value;
        const time = timeSelect.value;
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
                    date: `${date}T${time}`,
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