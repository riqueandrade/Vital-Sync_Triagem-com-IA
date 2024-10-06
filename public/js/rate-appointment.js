document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const ratingForm = document.getElementById('ratingForm');
    const appointmentId = new URLSearchParams(window.location.search).get('appointmentId');

    if (!appointmentId) {
        alert('ID da consulta não fornecido');
        window.location.href = '/dashboard.html';
        return;
    }

    ratingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = document.getElementById('rating').value;
        const comment = document.getElementById('comment').value;

        try {
            const response = await fetch('/api/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    appointmentId,
                    rating,
                    comment
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Avaliação enviada com sucesso!');
                window.location.href = '/dashboard.html';
            } else {
                throw new Error(data.message || 'Erro ao enviar avaliação');
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