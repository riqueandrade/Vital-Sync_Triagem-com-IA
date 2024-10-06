document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const requirements = {
        length: document.getElementById('length'),
        uppercase: document.getElementById('uppercase'),
        special: document.getElementById('special')
    };

    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });
    }

    function updatePasswordRequirements() {
        const password = passwordInput.value;
        requirements.length.classList.toggle('met', password.length >= 8);
        requirements.uppercase.classList.toggle('met', /[A-Z]/.test(password));
        requirements.special.classList.toggle('met', /[!@#$%^&*(),.?":{}|<>]/.test(password));
    }

    passwordInput.addEventListener('input', updatePasswordRequirements);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = passwordInput.value;
            const role = document.getElementById('role').value;

            if (!Object.values(requirements).every(req => req.classList.contains('met'))) {
                alert('Por favor, atenda a todos os requisitos da senha.');
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password, role }),
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Cadastro realizado com sucesso!');
                    window.location.href = '/login.html';
                } else {
                    alert(data.message || 'Erro ao fazer cadastro');
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao conectar com o servidor');
            }
        });
    }
});