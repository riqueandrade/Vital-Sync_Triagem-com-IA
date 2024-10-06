document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const socket = io();
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const messagesContainer = document.getElementById('messages');

    // Obter o ID da consulta da URL
    const appointmentId = new URLSearchParams(window.location.search).get('appointmentId');

    if (!appointmentId) {
        alert('ID da consulta não fornecido');
        window.location.href = '/dashboard.html';
        return;
    }

    // Carregar histórico de mensagens
    try {
        const response = await fetch(`/api/chat/${appointmentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const messages = await response.json();
        messages.forEach(message => addMessageToUI(message));
    } catch (error) {
        console.error('Erro ao carregar histórico de mensagens:', error);
    }

    // Entrar na sala de chat específica para esta consulta
    socket.emit('join room', appointmentId);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (messageInput.value || fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('appointmentId', appointmentId);
            formData.append('message', messageInput.value);
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.size > 5 * 1024 * 1024) {
                    alert('O arquivo é muito grande. O tamanho máximo permitido é 5MB.');
                    return;
                }
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                    alert('Tipo de arquivo não permitido. Apenas imagens (JPEG, PNG, GIF) e PDFs são aceitos.');
                    return;
                }
                formData.append('file', file);
            }

            try {
                const response = await fetch('/api/chat/with-file', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    socket.emit('chat message', {
                        room: appointmentId,
                        text: messageInput.value,
                        senderId: getUserIdFromToken(token),
                        timestamp: new Date().toISOString(),
                        filePath: result.filePath
                    });
                    messageInput.value = '';
                    fileInput.value = '';
                } else {
                    throw new Error('Erro ao enviar mensagem');
                }
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                alert('Erro ao enviar mensagem');
            }
        }
    });

    socket.on('chat message', (message) => {
        addMessageToUI(message);
    });

    function addMessageToUI(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(message.senderId === getUserIdFromToken(token) ? 'sent' : 'received');
        let messageContent = `
            <span class="sender">${message.sender_name}</span>
            <p>${message.text}</p>
        `;
        if (message.filePath) {
            const fileExtension = message.filePath.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                messageContent += `<img src="${message.filePath}" alt="Imagem enviada" style="max-width: 200px;">`;
            } else {
                messageContent += `<a href="${message.filePath}" target="_blank">Ver arquivo anexado</a>`;
            }
        }
        messageContent += `<span class="timestamp">${new Date(message.timestamp).toLocaleString()}</span>`;
        messageElement.innerHTML = messageContent;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function getUserIdFromToken(token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    }

    // Carregar informações da consulta
    try {
        const appointmentResponse = await fetch(`/api/appointments/${appointmentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const appointmentData = await appointmentResponse.json();

        document.getElementById('appointment-id').textContent = appointmentId;
        document.getElementById('patient-name').textContent = appointmentData.patientName;
        document.getElementById('doctor-name').textContent = appointmentData.doctorName;
    } catch (error) {
        console.error('Erro ao carregar informações da consulta:', error);
    }

    // Adicionar evento de logout
    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });

    let typingTimer;
    const doneTypingInterval = 1000; // tempo em ms

    messageInput.addEventListener('input', () => {
        clearTimeout(typingTimer);
        socket.emit('typing', { room: appointmentId, userId: getUserIdFromToken(token) });
        
        typingTimer = setTimeout(() => {
            socket.emit('stop typing', { room: appointmentId, userId: getUserIdFromToken(token) });
        }, doneTypingInterval);
    });

    socket.on('typing', (data) => {
        // Mostrar indicador de digitação
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.textContent = 'Digitando...';
        typingIndicator.style.display = 'block';
    });

    socket.on('stop typing', (data) => {
        // Esconder indicador de digitação
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.style.display = 'none';
    });
});