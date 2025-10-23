// ========== CHATBOT MODULE ==========
(async function() {
    const API_BASE = 'http://localhost:5000/api'; // your backend
    const USER_ID = localStorage.getItem('userId'); // fetch logged-in user

    // Create floating chatbot button
    const chatBtn = document.createElement('button');
    chatBtn.innerText = '💬';
    chatBtn.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
        border-radius: 50%; background: #111; color: white; border: none;
        cursor: pointer; z-index: 9999; font-weight: bold;
    `;
    document.body.appendChild(chatBtn);

    // Create chat panel
    const chatPanel = document.createElement('div');
    chatPanel.style.cssText = `
        position: fixed; bottom: 90px; right: 20px; width: 320px; max-height: 400px;
        background: white; border: 1px solid #ccc; border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: none; flex-direction: column;
        z-index: 9999; overflow: hidden;
        animation: slideUp 0.3s ease-out;
    `;
    chatPanel.innerHTML = `
        <div id="chatHeader" style="background:#111; color:white; padding:10px; font-weight:bold; cursor:move;">
            Assistant
            <span id="closeChat" style="float:right; cursor:pointer;">✕</span>
        </div>
        <div id="chatMessages" style="flex:1; padding:10px; overflow-y:auto; font-size:14px;"></div>
        <div style="display:flex; border-top:1px solid #ccc;">
            <input id="chatInput" type="text" placeholder="Type..." style="flex:1; border:none; padding:8px; font-size:14px;" />
            <button id="chatSend" style="background:#111; color:white; border:none; padding:8px 12px; cursor:pointer;">Send</button>
        </div>
    `;
    document.body.appendChild(chatPanel);

    // Show/hide
    chatBtn.addEventListener('click', () => {
        chatPanel.style.display = chatPanel.style.display === 'flex' ? 'none' : 'flex';
        chatPanel.style.flexDirection = 'column';
    });
    chatPanel.querySelector('#closeChat').addEventListener('click', () => chatPanel.style.display = 'none');

    const chatMessages = chatPanel.querySelector('#chatMessages');
    const chatInput = chatPanel.querySelector('#chatInput');
    const chatSend = chatPanel.querySelector('#chatSend');

    // Fetch user data from backend
    let userData = {};
    if (USER_ID) {
        try {
            const resp = await fetch(`${API_BASE}/chatbot/user/${USER_ID}`);
            const data = await resp.json();
            if (data.success) userData = data.userData;
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    }

    // Simple assistant response function
    async function getBotResponse(message) {
        // Add personalized info from userData
        let systemPrompt = `You are an internship guide. Keep the replies short, precise and formal. The user's info:
        Name: ${userData.name || 'Unknown'}
        Academics: ${userData.academics.join(', ') || 'None'}
        Skills: ${userData.skills.join(', ') || 'None'}
        Hobbies: ${userData.hobbies.join(', ') || 'None'}`;

        const payload = {
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ]
        };

        try {
            const res = await fetch(`${API_BASE}/chatbot/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
            });
            const data = await res.json();
            return data.reply;
        } catch (err) {
            console.error(err);
            return "Error connecting to AI API.";
        }
    }

    // Send message
    async function sendMessage() {
        const msg = chatInput.value.trim();
        if (!msg) return;
        chatMessages.innerHTML += `<div style="text-align:right; margin-bottom:5px;"><b>You:</b> ${msg}</div>`;
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const botReplyDiv = document.createElement('div');
        botReplyDiv.innerHTML = `<b>Assistant:</b> ⟳ Thinking...`;
        chatMessages.appendChild(botReplyDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const reply = await getBotResponse(msg);
        botReplyDiv.innerHTML = `<b>Assistant:</b> ${reply}`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // Optional: draggable panel
    let isDragging = false, offsetX, offsetY;
    const header = chatPanel.querySelector('#chatHeader');
    header.addEventListener('mousedown', e => {
        isDragging = true;
        offsetX = e.clientX - chatPanel.offsetLeft;
        offsetY = e.clientY - chatPanel.offsetTop;
    });
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('mousemove', e => {
        if (isDragging) {
            chatPanel.style.left = e.clientX - offsetX + 'px';
            chatPanel.style.top = e.clientY - offsetY + 'px';
        }
    });

})();
