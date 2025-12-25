const GROQ_API_URL = "https://senya-py.onrender.com/chat"; // Будем отправлять запросы ИИ на наш бэкенд
const AUTH_URL = "https://senya-py.onrender.com/auth/google"; // URL для авторизации

// Элементы UI
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const userNameDisplay = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const sendBtn = document.getElementById('send-btn');
const chatsList = document.getElementById('chats');

let currentChatMessages = []; // Сообщения текущего чата

// --- Функции авторизации ---
async function handleCredentialResponse(response) {
    try {
        const res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('userToken', data.jwtToken); // Сохраняем JWT токен от нашего бэкенда
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userPicture', data.user.picture);
            showChatInterface();
        } else {
            console.error('Ошибка входа:', data.error);
            alert('Ошибка входа. Попробуйте еще раз.');
        }
    } catch (err) {
        console.error('Ошибка сети или сервера:', err);
        alert('Не удалось подключиться к серверу. Попробуйте позже.');
    }
}

function showChatInterface() {
    loginContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');

    // Обновляем данные пользователя
    userNameDisplay.textContent = localStorage.getItem('userName') || 'Гость';
    userAvatar.src = localStorage.getItem('userPicture') || 'https://via.placeholder.com/40'; // Заглушка
    
    // Загрузка или создание нового чата
    loadChat('default'); // Загружаем "дефолтный" чат при входе
    renderChatsList(); // Отображаем список чатов
}

function logout() {
    localStorage.clear();
    location.reload(); // Перезагружаем страницу для выхода
}

// --- Функции чата ---
function newChat() {
    // В реальном приложении здесь будет логика создания нового чата на сервере
    currentChatMessages = []; // Очищаем текущие сообщения
    chatMessages.innerHTML = ''; // Очищаем интерфейс
    // Можно добавить выделение нового чата в списке
    renderMessage({ role: 'ai', content: 'Привет! Я Senya AI. Чем могу помочь?' });
    updateChatListUI(); // Обновляем список чатов
}

function loadChat(chatId) {
    // В реальном приложении здесь будет загрузка истории чата с сервера
    // Пока просто имитация:
    if (chatId === 'default') {
        currentChatMessages = [{ role: 'ai', content: 'Привет! Я Senya AI. Чем могу помочь?' }];
    } else {
        currentChatMessages = [{ role: 'ai', content: `Загружен чат ${chatId}.` }];
    }
    renderChatMessages();
    updateChatListUI(chatId); // Обновляем UI, выделяя активный чат
}

function renderChatsList() {
    // Это очень упрощенно. В реальном приложении здесь будет список чатов с сервера
    chatsList.innerHTML = `
        <div class="chat-item active" onclick="loadChat('default')">Начальный чат</div>
        <div class="chat-item" onclick="loadChat('chat-2')">Идеи для проекта</div>
    `;
}

function updateChatListUI(activeChatId = 'default') {
    const chatItems = chatsList.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.classList.remove('active');
        if (item.onclick.toString().includes(`loadChat('${activeChatId}')`)) {
            item.classList.add('active');
        }
    });
}


function renderMessage(message) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', message.role);
    msgDiv.textContent = message.content;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Прокрутка вниз
}

async function sendMessage() {
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    renderMessage({ role: 'user', content: userMessage });
    currentChatMessages.push({ role: 'user', content: userMessage });
    messageInput.value = '';
    sendBtn.disabled = true;

    try {
        // Отправляем запрос на наш бэкенд, который уже работает с Groq
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` // Отправляем JWT токен
            },
            body: JSON.stringify({
                messages: currentChatMessages, // Вся история чата
                model: "llama3-8b-8192" // Используем Llama3, так как gpt-oss-120b может быть недоступен
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Ошибка при получении ответа от ИИ');
        }

        const data = await res.json();
        const aiResponse = data.response; // Предполагаем, что бэкенд вернет { response: "текст" }

        renderMessage({ role: 'ai', content: aiResponse });
        currentChatMessages.push({ role: 'ai', content: aiResponse });

    } catch (error) {
        console.error('Ошибка при обращении к ИИ:', error);
        renderMessage({ role: 'ai', content: `Произошла ошибка: ${error.message}. Попробуйте позже.` });
    } finally {
        sendBtn.disabled = false;
    }
}

function renderChatMessages() {
    chatMessages.innerHTML = ''; // Очищаем
    currentChatMessages.forEach(msg => renderMessage(msg));
}

// Проверяем авторизацию при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('userToken')) {
        showChatInterface();
    } else {
        loginContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
    }

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});
