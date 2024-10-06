document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const symptomForm = document.getElementById('symptomForm');
    const symptomsInput = document.getElementById('symptoms');
    const resultDiv = document.getElementById('result');

    symptomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const symptoms = symptomsInput.value;

        try {
            const response = await fetch('/api/symptom-checker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ symptoms })
            });

            const data = await response.json();

            if (response.ok) {
                resultDiv.innerHTML = `<h3>Análise:</h3><p>${data.analysis}</p>`;
                resultDiv.style.display = 'block';
            } else {
                throw new Error(data.message || 'Erro ao analisar sintomas');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
        }
    });
});